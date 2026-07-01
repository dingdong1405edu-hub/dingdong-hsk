import { PrismaClient, HSKLevel, QuestionType, WritingTaskType, MaterialCategory, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type SeedDoc = Record<string, any>;

/**
 * Read every JSON file in prisma/seed-data/ (bulk content authored in batch).
 * Malformed files are skipped with a warning so one bad file never aborts the
 * whole seed (the deploy runs `db:seed || true`, but we still want max coverage).
 */
function readSeedDocs(): SeedDoc[] {
  const dir = path.join(process.cwd(), "prisma", "seed-data");
  if (!fs.existsSync(dir)) {
    console.log("[seed-data] no seed-data/ directory, skipping bulk content");
    return [];
  }
  const out: SeedDoc[] = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      out.push({ __file: file, ...json });
    } catch (e) {
      console.error(`[seed-data] SKIP ${file}: ${(e as Error).message}`);
    }
  }
  return out;
}

async function upsertQuestion(q: any, link: { readingId?: string; listeningId?: string }, fallbackOrder: number) {
  const data = {
    type: q.type as QuestionType,
    prompt: String(q.prompt),
    promptPinyin: q.promptPinyin ?? null,
    options: (q.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
    explanation: q.explanation ?? null,
    order: typeof q.order === "number" ? q.order : fallbackOrder,
    ...link,
  };
  await prisma.question.upsert({ where: { id: String(q.id) }, update: data, create: { id: String(q.id), ...data } });
}

async function loadSeedData() {
  const docs = readSeedDocs();
  const counts: Record<string, number> = {
    vocab: 0, grammar: 0, hanzi: 0, reading: 0, listening: 0, writing: 0, speaking: 0, materials: 0, questions: 0,
  };

  for (const doc of docs) {
    try {
      switch (doc.kind) {
        case "vocab":
        case "grammar": {
          const isGrammar = doc.kind === "grammar";
          const unitModel = isGrammar ? prisma.grammarUnit : prisma.vocabUnit;
          const lessonModel = isGrammar ? prisma.grammarLesson : prisma.vocabLesson;
          for (const u of doc.units ?? []) {
            const unitData = { title: u.title, titleZh: u.titleZh, hskLevel: u.hskLevel as HSKLevel, order: u.order ?? 1 };
            await (unitModel as any).upsert({ where: { id: u.id }, update: unitData, create: { id: u.id, ...unitData } });
            for (const l of u.lessons ?? []) {
              const lessonData = { title: l.title ?? "", order: l.order ?? 1, exercises: (l.exercises ?? []) as Prisma.InputJsonValue };
              await (lessonModel as any).upsert({
                where: { id: l.id },
                update: lessonData,
                create: { id: l.id, unitId: u.id, ...lessonData },
              });
              // Vocab-only: per-word content driving the show → trace → write →
              // flashcard learner flow. Upsert by stable id so re-seeding merges.
              if (!isGrammar && Array.isArray(l.words)) {
                let wOrder = 0;
                for (const w of l.words) {
                  wOrder++;
                  const wordData = {
                    order: w.order ?? wOrder,
                    hanzi: w.hanzi,
                    pinyin: w.pinyin,
                    meaning: w.meaning,
                    examples: (w.examples ?? []) as Prisma.InputJsonValue,
                    audioUrl: w.audioUrl ?? null,
                  };
                  await prisma.vocabWord.upsert({
                    where: { id: w.id },
                    update: wordData,
                    create: { id: w.id, lessonId: l.id, ...wordData },
                  });
                }
              }
            }
            counts[doc.kind]++;
          }
          break;
        }
        case "hanzi": {
          for (const c of doc.characters ?? []) {
            const data = {
              pinyin: c.pinyin, tone: c.tone ?? 0, meaning: c.meaning, hskLevel: c.hskLevel as HSKLevel,
              strokeCount: c.strokeCount ?? 0,
              strokeOrder: (c.strokeOrder ?? { strokes: c.strokeCount ?? 0 }) as Prisma.InputJsonValue,
              examples: (c.examples ?? []) as Prisma.InputJsonValue,
            };
            // Upsert by the natural unique key (character) so overlapping files merge cleanly.
            await prisma.hanziCharacter.upsert({
              where: { character: c.character },
              update: data,
              create: { id: c.id, character: c.character, ...data },
            });
            counts.hanzi++;
          }
          break;
        }
        case "reading": {
          for (const t of doc.tests ?? []) {
            const data = {
              title: t.title, titleZh: t.titleZh, hskLevel: t.hskLevel as HSKLevel,
              passage: t.passage, passagePinyin: t.passagePinyin ?? null, timeLimit: t.timeLimit ?? 600,
            };
            await prisma.readingTest.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
            let i = 0;
            for (const q of t.questions ?? []) await upsertQuestion(q, { readingId: t.id }, ++i), counts.questions++;
            counts.reading++;
          }
          break;
        }
        case "listening": {
          for (const t of doc.tests ?? []) {
            const data = {
              title: t.title, hskLevel: t.hskLevel as HSKLevel, audioUrl: t.audioUrl ?? "",
              transcript: t.transcript ?? null, timeLimit: t.timeLimit ?? 300,
            };
            await prisma.listeningTest.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
            let i = 0;
            for (const q of t.questions ?? []) await upsertQuestion(q, { listeningId: t.id }, ++i), counts.questions++;
            counts.listening++;
          }
          break;
        }
        case "writing": {
          for (const w of doc.tasks ?? []) {
            const data = {
              taskType: w.taskType as WritingTaskType, prompt: w.prompt, promptZh: w.promptZh ?? null,
              minChars: w.minChars ?? 50, timeLimit: w.timeLimit ?? 900, hskLevel: w.hskLevel as HSKLevel,
            };
            await prisma.writingTask.upsert({ where: { id: w.id }, update: data, create: { id: w.id, ...data } });
            counts.writing++;
          }
          break;
        }
        case "speaking": {
          for (const s of doc.sets ?? []) {
            const data = {
              title: s.title ?? "", hskLevel: s.hskLevel as HSKLevel,
              part1Sentences: s.part1Sentences as Prisma.InputJsonValue,
              part2Passage: s.part2Passage as Prisma.InputJsonValue,
              part3Questions: s.part3Questions as Prisma.InputJsonValue,
            };
            await prisma.speakingSet.upsert({ where: { id: s.id }, update: data, create: { id: s.id, ...data } });
            counts.speaking++;
          }
          break;
        }
        case "materials": {
          for (const m of doc.materials ?? []) {
            const data = {
              title: m.title, titleZh: m.titleZh ?? null, category: m.category as MaterialCategory,
              hskLevel: m.hskLevel as HSKLevel, summary: m.summary, content: m.content as Prisma.InputJsonValue,
              tags: (m.tags ?? []) as Prisma.InputJsonValue, readMinutes: m.readMinutes ?? 5,
              order: m.order ?? 0, published: m.published ?? true,
            };
            await prisma.material.upsert({ where: { id: m.id }, update: data, create: { id: m.id, ...data } });
            counts.materials++;
          }
          break;
        }
        default:
          console.warn(`[seed-data] ${doc.__file}: unknown kind "${doc.kind}"`);
      }
    } catch (e) {
      console.error(`[seed-data] ERROR in ${doc.__file}: ${(e as Error).message}`);
    }
  }
  console.log("[seed-data] loaded:", JSON.stringify(counts));
}

// Derive vocabulary words (hanzi/pinyin/meaning) from a lesson's legacy
// `exercises` JSON so the per-word learner flow has content. Prefers `match`
// pairs (they carry all three fields), then falls back to pinyinMatch / translate.
function wordsFromExercises(exercises: any): Array<{ hanzi: string; pinyin: string; meaning: string }> {
  const list = Array.isArray(exercises) ? exercises : [];
  const out: Array<{ hanzi: string; pinyin: string; meaning: string }> = [];
  const seen = new Set<string>();
  const add = (hanzi: any, pinyin: any, meaning: any) => {
    const h = String(hanzi ?? "").trim();
    if (!h || seen.has(h)) return;
    seen.add(h);
    out.push({ hanzi: h, pinyin: String(pinyin ?? "").trim(), meaning: String(meaning ?? "").trim() });
  };
  for (const e of list) if (e?.type === "match" && Array.isArray(e.pairs)) for (const p of e.pairs) add(p.zh, p.pinyin, p.vi);
  if (out.length === 0) for (const e of list) if (e?.type === "pinyinMatch" && Array.isArray(e.pairs)) for (const p of e.pairs) add(p.zh, p.pinyin, "");
  if (out.length === 0) for (const e of list) if (e?.type === "translate" && e.direction === "vi_to_zh" && e.answer) add(e.answer, e.pinyin, e.prompt);
  return out;
}

// Backfill: any vocab lesson with no VocabWord rows gets words derived from its
// exercises. Idempotent — lessons that already have words (sample data or
// admin-authored) are skipped, so manual edits are never clobbered.
async function migrateVocabWords() {
  const lessons = await prisma.vocabLesson.findMany({ include: { _count: { select: { words: true } } } });
  let populated = 0;
  let upserted = 0;
  for (const l of lessons) {
    if (l._count.words > 0) continue;
    const words = wordsFromExercises(l.exercises);
    if (words.length === 0) continue;
    populated++;
    let i = 0;
    for (const w of words) {
      i++;
      const id = `${l.id}-mw${i}`;
      const data = { order: i, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, examples: [] as Prisma.InputJsonValue };
      await prisma.vocabWord.upsert({ where: { id }, update: data, create: { id, lessonId: l.id, ...data } });
      upserted++;
    }
  }
  console.log(`[migrate vocab words] lessons populated: ${populated}, words upserted: ${upserted}`);
}

// ===================================================================
//  HỌC THEO LỘ TRÌNH — khung khóa / chương / bài (chủ đề).
//  Nội dung từng kỹ năng (từ vựng, ngữ pháp, nghe, nói, đọc, viết) sẽ
//  được điền sau qua RoadmapSection; ở bước này chỉ dựng chủ đề cho map.
// ===================================================================
type RoadmapTopic = { topic: string; topicZh: string; icon: string };
type RoadmapChapter = { title: string; titleZh: string; lessons: RoadmapTopic[] };
type RoadmapCourse = {
  level: HSKLevel;
  title: string;
  titleZh: string;
  description: string;
  chapters: RoadmapChapter[];
};

const ROADMAP_COURSES: RoadmapCourse[] = [
  {
    level: HSKLevel.HSK1,
    title: "Khởi đầu",
    titleZh: "入门",
    description: "150 từ vựng nền tảng. Chào hỏi, số đếm, gia đình và những câu giao tiếp đầu tiên.",
    chapters: [
      {
        title: "Chào hỏi & Làm quen",
        titleZh: "问候与认识",
        lessons: [
          { topic: "Xin chào & Tạm biệt", topicZh: "你好与再见", icon: "👋" },
          { topic: "Cảm ơn & Xin lỗi", topicZh: "谢谢与对不起", icon: "🙏" },
          { topic: "Đại từ nhân xưng", topicZh: "人称代词", icon: "🧑" },
          { topic: "Tên & Giới thiệu", topicZh: "名字与介绍", icon: "📛" },
          { topic: "Quốc tịch", topicZh: "国籍", icon: "🌏" },
        ],
      },
      {
        title: "Số đếm & Thời gian",
        titleZh: "数字与时间",
        lessons: [
          { topic: "Số 1–10", topicZh: "数字 1–10", icon: "🔢" },
          { topic: "Số 11–100", topicZh: "数字 11–100", icon: "💯" },
          { topic: "Ngày & Tháng", topicZh: "日期", icon: "📅" },
          { topic: "Giờ giấc", topicZh: "时间", icon: "🕐" },
          { topic: "Thứ trong tuần", topicZh: "星期", icon: "🗓️" },
        ],
      },
      {
        title: "Gia đình & Đời sống",
        titleZh: "家庭与生活",
        lessons: [
          { topic: "Thành viên gia đình", topicZh: "家人", icon: "👨‍👩‍👧" },
          { topic: "Đồ ăn & Thức uống", topicZh: "饮食", icon: "🍜" },
          { topic: "Mua sắm cơ bản", topicZh: "购物", icon: "🛒" },
          { topic: "Sở thích", topicZh: "爱好", icon: "⚽" },
          { topic: "Một ngày của tôi", topicZh: "我的一天", icon: "☀️" },
        ],
      },
    ],
  },
  {
    level: HSKLevel.HSK2,
    title: "Cuộc sống thường nhật",
    titleZh: "日常生活",
    description: "595 từ vựng HSK2 qua 35 bài: sở thích, du lịch, thói quen, mua sắm, ăn uống, đi lại, so sánh và trải nghiệm.",
    // 12 Phần × (2–4 bài) = 35 bài, khớp PDF "TỪ VỰNG HSK2 — 35 BÀI".
    // Nội dung Từ vựng nạp riêng qua prisma/load-roadmap-vocab-HSK2.ts (id bài: rl-hsk2-1..35).
    chapters: [
      {
        title: "Phần I · Sở thích, du lịch & số lượng",
        titleZh: "",
        lessons: [
          { topic: "Sở thích & du lịch", topicZh: "我想去旅游", icon: "🧳" },
          { topic: "Lựa chọn tốt nhất", topicZh: "去北京旅游最好", icon: "🌏" },
          { topic: "Số lượng ước lượng", topicZh: "你要几个？多少钱？", icon: "🔢" },
        ],
      },
      {
        title: "Phần II · Thói quen & sức khỏe",
        titleZh: "",
        lessons: [
          { topic: "Thói quen hằng ngày", topicZh: "我每天六点起床", icon: "⏰" },
          { topic: "Hỏi thăm sức khỏe", topicZh: "你是不是病了？", icon: "🤒" },
          { topic: "Tâm trạng & cảm giác", topicZh: "我有点儿累", icon: "😟" },
        ],
      },
      {
        title: "Phần III · Mô tả đồ vật & vị trí",
        titleZh: "",
        lessons: [
          { topic: "Mô tả & sở hữu", topicZh: "左边红色的是我的", icon: "🎨" },
          { topic: "Hành động ngắn", topicZh: "等我一下", icon: "✋" },
          { topic: "Cảm thán", topicZh: "这个真漂亮！", icon: "😍" },
        ],
      },
      {
        title: "Phần IV · Công việc & quan hệ",
        titleZh: "",
        lessons: [
          { topic: "Giới thiệu & quen biết", topicZh: "我来介绍一下", icon: "🤝" },
          { topic: "Công việc & giúp đỡ", topicZh: "他帮我介绍了工作", icon: "💼" },
          { topic: "Nhấn mạnh thông tin", topicZh: "我是去年来的", icon: "📌" },
          { topic: "Thời điểm & hoàn thành", topicZh: "下班的时候", icon: "🕕" },
        ],
      },
      {
        title: "Phần V · Mua sắm",
        titleZh: "",
        lessons: [
          { topic: "Mua sắm & đề nghị", topicZh: "买这件衣服吧", icon: "🛍️" },
          { topic: "Giá cả & mặc cả", topicZh: "太贵了，便宜点儿吧", icon: "💰" },
          { topic: "Lưỡng lự", topicZh: "我还想再看看", icon: "🤔" },
        ],
      },
      {
        title: "Phần VI · Ăn uống & lý do",
        titleZh: "",
        lessons: [
          { topic: "Ăn uống & hỏi lý do", topicZh: "你怎么不吃了？", icon: "🍽️" },
          { topic: "Nhân quả", topicZh: "因为太辣，所以…", icon: "🌶️" },
          { topic: "Nhấn mạnh toàn thể", topicZh: "个个都好吃", icon: "🍱" },
        ],
      },
      {
        title: "Phần VII · Khoảng cách & đi lại",
        titleZh: "",
        lessons: [
          { topic: "Khoảng cách", topicZh: "你家离公司远吗？", icon: "📏" },
          { topic: "Đi lại & ngữ khí", topicZh: "我还在等车呢", icon: "🚌" },
          { topic: "Lộ trình & hướng", topicZh: "从家到公司", icon: "🗺️" },
        ],
      },
      {
        title: "Phần VIII · Quyết định & yêu cầu",
        titleZh: "",
        lessons: [
          { topic: "Suy nghĩ & quyết định", topicZh: "让我想想再说", icon: "💭" },
          { topic: "Đề nghị lịch sự", topicZh: "你帮我一下，好吗？", icon: "🙏" },
          { topic: "Nhắc nhở & tìm đồ", topicZh: "别找了，在桌子上呢", icon: "🔍" },
        ],
      },
      {
        title: "Phần IX · Học tập & kết quả",
        titleZh: "",
        lessons: [
          { topic: "Kế hoạch học tập", topicZh: "我打算好好复习", icon: "📚" },
          { topic: "Kết quả công việc", topicZh: "题太多，我没做完", icon: "✍️" },
          { topic: "Tiếp nhận thông tin", topicZh: "我听懂了，也看见了", icon: "👂" },
          { topic: "Thứ tự", topicZh: "这是第几课？", icon: "🔢" },
        ],
      },
      {
        title: "Phần X · So sánh & đánh giá",
        titleZh: "",
        lessons: [
          { topic: "So sánh", topicZh: "他比我大三岁", icon: "⚖️" },
          { topic: "Đánh giá hành động", topicZh: "你穿得太少了", icon: "👕" },
          { topic: "Suy đoán", topicZh: "明天可能会下雨", icon: "🌧️" },
        ],
      },
      {
        title: "Phần XI · Trạng thái & trải nghiệm",
        titleZh: "",
        lessons: [
          { topic: "Trạng thái tồn tại", topicZh: "门开着呢", icon: "🚪" },
          { topic: "Trải nghiệm quá khứ", topicZh: "你看过那个电影吗？", icon: "🎬" },
        ],
      },
      {
        title: "Phần XII · Sự kiện sắp tới & ôn tập",
        titleZh: "",
        lessons: [
          { topic: "Sự kiện sắp tới & ôn tập", topicZh: "新年就要到了", icon: "🎉" },
        ],
      },
    ],
  },
  {
    level: HSKLevel.HSK3,
    title: "Giao tiếp mở rộng",
    titleZh: "扩展交流",
    description: "599 từ vựng HSK3 qua 43 bài: Bài 1–20 theo giáo trình, Bài 21–32 theo chủ đề, Bài 33–43 theo vần (HSK 3.0).",
    // 10 chương × (2–6 bài) = 43 bài, khớp PDF "TỪ VỰNG HSK 3 — 43 BÀI".
    // Nội dung Từ vựng nạp riêng qua prisma/load-roadmap-vocab-HSK3.ts (id bài: rl-hsk3-1..43).
    chapters: [
      {
        title: "Phần I · Giáo trình HSK 3 (Bài 1–5)",
        titleZh: "",
        lessons: [
          { topic: "Kế hoạch cuối tuần", topicZh: "周末你有什么打算？", icon: "🗓️" },
          { topic: "Khi nào quay về?", topicZh: "他什么时候回来？", icon: "🔙" },
          { topic: "Đồ vật trên bàn", topicZh: "桌子上放着很多饮料", icon: "🥤" },
          { topic: "Tiếp khách niềm nở", topicZh: "她总是笑着跟客人说话", icon: "😊" },
          { topic: "Càng ngày càng…", topicZh: "我最近越来越胖了", icon: "⚖️" },
        ],
      },
      {
        title: "Phần II · Giáo trình HSK 3 (Bài 6–10)",
        titleZh: "",
        lessons: [
          { topic: "Bỗng dưng không thấy", topicZh: "怎么突然找不到了？", icon: "🔍" },
          { topic: "Quen biết & quan hệ", topicZh: "我跟她都认识五年了", icon: "👫" },
          { topic: "Đi đâu theo đó", topicZh: "你去哪儿我就去哪儿", icon: "🧭" },
          { topic: "Giỏi như người bản xứ", topicZh: "她的汉语说得跟中国人一样好", icon: "🗣️" },
          { topic: "So sánh môn học", topicZh: "数学比历史难多了", icon: "📐" },
        ],
      },
      {
        title: "Phần III · Giáo trình HSK 3 (Bài 11–15)",
        titleZh: "",
        lessons: [
          { topic: "Nhớ tắt điều hòa", topicZh: "别忘了把空调关了！", icon: "❄️" },
          { topic: "Cất đồ quan trọng", topicZh: "把重要的东西放在我这儿吧", icon: "🎒" },
          { topic: "Tôi đi bộ về", topicZh: "我是走回来的", icon: "🚶" },
          { topic: "Mang trái cây qua đây", topicZh: "你把水果拿过来！", icon: "🍉" },
          { topic: "Không có vấn đề gì", topicZh: "其他都没什么问题", icon: "✅" },
        ],
      },
      {
        title: "Phần IV · Giáo trình HSK 3 (Bài 16–20)",
        titleZh: "",
        lessons: [
          { topic: "Mệt muốn ngủ ngay", topicZh: "我现在累得下了班就想睡觉", icon: "😴" },
          { topic: "Ai cũng có cách", topicZh: "谁都有办法看好你的病", icon: "🩺" },
          { topic: "Tôi tin họ sẽ đồng ý", topicZh: "我相信他们会同意的", icon: "🤝" },
          { topic: "Bạn không nhận ra à?", topicZh: "你没看出来吗？", icon: "👀" },
          { topic: "Bị ảnh hưởng", topicZh: "我被他影响了！", icon: "🔄" },
        ],
      },
      {
        title: "Phần V · Chủ đề: Đời sống & Thiên nhiên",
        titleZh: "",
        lessons: [
          { topic: "Giao thông & phương tiện", topicZh: "交通与工具", icon: "🚗" },
          { topic: "Thời tiết & bốn mùa", topicZh: "天气与四季", icon: "🌦️" },
          { topic: "Trang phục & mua sắm", topicZh: "服装与购物", icon: "👗" },
          { topic: "Nhà cửa & đồ dùng", topicZh: "家居与用品", icon: "🏠" },
          { topic: "Động vật & thiên nhiên", topicZh: "动物与自然", icon: "🐼" },
          { topic: "Cơ thể & sức khỏe", topicZh: "身体与健康", icon: "🦷" },
        ],
      },
      {
        title: "Phần VI · Chủ đề: Sinh hoạt & Xã hội",
        titleZh: "",
        lessons: [
          { topic: "Ăn uống & thực phẩm", topicZh: "饮食与食物", icon: "🍰" },
          { topic: "Giải trí & sở thích", topicZh: "娱乐与爱好", icon: "🎮" },
          { topic: "Gia đình & quan hệ", topicZh: "家庭与关系", icon: "👨‍👩‍👧" },
          { topic: "Công việc & văn phòng", topicZh: "工作与办公室", icon: "🏢" },
          { topic: "Học tập & trường học", topicZh: "学习与学校", icon: "📚" },
          { topic: "Cảm xúc & trạng thái", topicZh: "情绪与状态", icon: "😟" },
        ],
      },
      {
        title: "Phần VII · Từ vựng theo vần A–D",
        titleZh: "",
        lessons: [
          { topic: "Theo vần: A–B", topicZh: "按拼音 A–B", icon: "🔤" },
          { topic: "Theo vần: B–C", topicZh: "按拼音 B–C", icon: "🔤" },
          { topic: "Theo vần: C–D", topicZh: "按拼音 C–D", icon: "🔤" },
        ],
      },
      {
        title: "Phần VIII · Từ vựng theo vần F–L",
        titleZh: "",
        lessons: [
          { topic: "Theo vần: F–G", topicZh: "按拼音 F–G", icon: "🔤" },
          { topic: "Theo vần: H–J", topicZh: "按拼音 H–J", icon: "🔤" },
          { topic: "Theo vần: J–L", topicZh: "按拼音 J–L", icon: "🔤" },
        ],
      },
      {
        title: "Phần IX · Từ vựng theo vần M–W",
        titleZh: "",
        lessons: [
          { topic: "Theo vần: M–P", topicZh: "按拼音 M–P", icon: "🔤" },
          { topic: "Theo vần: Q–S", topicZh: "按拼音 Q–S", icon: "🔤" },
          { topic: "Theo vần: S–W", topicZh: "按拼音 S–W", icon: "🔤" },
        ],
      },
      {
        title: "Phần X · Từ vựng theo vần X–Z",
        titleZh: "",
        lessons: [
          { topic: "Theo vần: X–Z", topicZh: "按拼音 X–Z", icon: "🔤" },
          { topic: "Theo vần: Z", topicZh: "按拼音 Z", icon: "🔤" },
        ],
      },
    ],
  },
  {
    level: HSKLevel.HSK4,
    title: "Diễn đạt ý kiến",
    titleZh: "表达观点",
    description: "Bàn luận công việc, văn hóa và xã hội; bày tỏ quan điểm, đồng tình hay phản biện.",
    chapters: [
      {
        title: "Công việc & Sự nghiệp",
        titleZh: "工作与事业",
        lessons: [
          { topic: "Phỏng vấn xin việc", topicZh: "求职面试", icon: "🧑‍💼" },
          { topic: "Môi trường công sở", topicZh: "职场", icon: "🏢" },
          { topic: "Kỹ năng & Năng lực", topicZh: "技能", icon: "🛠️" },
          { topic: "Quản lý thời gian", topicZh: "时间管理", icon: "⌛" },
        ],
      },
      {
        title: "Xã hội & Văn hóa",
        titleZh: "社会与文化",
        lessons: [
          { topic: "Truyền thông", topicZh: "媒体", icon: "📺" },
          { topic: "Văn hóa Trung Hoa", topicZh: "中国文化", icon: "🏮" },
          { topic: "Phong tục", topicZh: "风俗", icon: "🎏" },
          { topic: "Môi trường", topicZh: "环境", icon: "🌱" },
        ],
      },
      {
        title: "Tư duy & Lập luận",
        titleZh: "思辨与论证",
        lessons: [
          { topic: "Bày tỏ quan điểm", topicZh: "表达观点", icon: "🗣️" },
          { topic: "Đồng ý & Phản đối", topicZh: "赞成与反对", icon: "👍" },
          { topic: "Giải quyết vấn đề", topicZh: "解决问题", icon: "🧩" },
          { topic: "Tranh luận", topicZh: "辩论", icon: "⚔️" },
        ],
      },
    ],
  },
  {
    level: HSKLevel.HSK5,
    title: "Ngôn ngữ học thuật",
    titleZh: "学术语言",
    description: "Từ vựng HSK5 theo chủ đề đời sống, xã hội và các bài đọc chuyên sâu.",
    // CHỈ khai báo Phần I (Bài 1–5) ở đây. Phần II (Câu chuyện & Bài đọc: Bài 6, 19–24…)
    // do prisma/load-roadmap-vocab-HSK5.ts sở hữu vì seedRoadmap đánh id theo bộ đếm
    // chạy nên KHÔNG tạo được id ngắt quãng (rl-hsk5-19). db:seed chỉ động Bài 1–5,
    // không đụng Bài 6+. Toàn bộ nội dung Từ vựng nạp qua loader (id bài: rl-hsk5-<số chương>).
    chapters: [
      {
        title: "Phần I · Chủ đề đời sống & xã hội (Bài 1–5)",
        titleZh: "",
        lessons: [
          { topic: "Tình yêu và Hôn nhân", topicZh: "爱情与婚姻", icon: "💑" },
          { topic: "Tình bạn chân chính", topicZh: "真正的友谊", icon: "🤝" },
          { topic: "Thái độ sống", topicZh: "人生态度", icon: "🌱" },
          { topic: "Nghệ thuật và Văn hóa", topicZh: "艺术与文化", icon: "🎨" },
          { topic: "Công việc và Sự nghiệp", topicZh: "工作与事业", icon: "💼" },
        ],
      },
    ],
  },
  {
    level: HSKLevel.HSK6,
    title: "Thành thạo & Tinh tế",
    titleZh: "精通与雅致",
    description: "Đỉnh cao HSK: thành ngữ, tu từ, triết học, hùng biện và sáng tác như người bản ngữ.",
    chapters: [
      {
        title: "Tư duy bậc cao",
        titleZh: "高阶思维",
        lessons: [
          { topic: "Thành ngữ & Tục ngữ", topicZh: "成语与谚语", icon: "🐉" },
          { topic: "Ẩn dụ & Tu từ", topicZh: "修辞", icon: "🎼" },
          { topic: "Triết học", topicZh: "哲学", icon: "☯️" },
          { topic: "Lịch sử Trung Hoa", topicZh: "中国历史", icon: "📜" },
        ],
      },
      {
        title: "Chuyên sâu",
        titleZh: "专业领域",
        lessons: [
          { topic: "Chính trị & Pháp luật", topicZh: "政治与法律", icon: "⚖️" },
          { topic: "Khoa học & Vũ trụ", topicZh: "科学与宇宙", icon: "🪐" },
          { topic: "Nghệ thuật", topicZh: "艺术", icon: "🖼️" },
          { topic: "Kinh tế vĩ mô", topicZh: "宏观经济", icon: "🏦" },
        ],
      },
      {
        title: "Đỉnh cao",
        titleZh: "巅峰",
        lessons: [
          { topic: "Hùng biện", topicZh: "演讲", icon: "🎤" },
          { topic: "Sáng tác", topicZh: "写作创作", icon: "🖋️" },
        ],
      },
    ],
  },
];

/**
 * Dựng lộ trình học (Course → RoadmapLesson) từ ROADMAP_COURSES.
 * Idempotent: upsert theo id ổn định (`course-hsk1`, `rl-hsk1-3`).
 * Gán sẵn tiến độ mẫu cho tài khoản demo để map hiển thị đủ trạng thái
 * (đã hoàn thành / đang học / bị khóa).
 */
async function seedRoadmap(testUserId: string) {
  let courseCount = 0;
  let lessonCount = 0;

  for (let ci = 0; ci < ROADMAP_COURSES.length; ci++) {
    const c = ROADMAP_COURSES[ci];
    const slug = c.level.toLowerCase(); // "hsk1"
    const courseId = `course-${slug}`;
    const courseData = {
      hskLevel: c.level,
      title: c.title,
      titleZh: c.titleZh,
      description: c.description,
      order: ci + 1,
      published: true,
    };
    await prisma.course.upsert({
      where: { id: courseId },
      update: courseData,
      create: { id: courseId, ...courseData },
    });
    courseCount++;

    let order = 0;
    for (let chi = 0; chi < c.chapters.length; chi++) {
      const ch = c.chapters[chi];
      const chapterOrder = chi + 1;
      // Upsert theo khoá duy nhất (courseId, order) — KHÔNG dùng id cố định — để hội tụ
      // với chương do backfill tạo (id cuid) thay vì đụng @@unique([courseId, order]).
      const chapter = await prisma.roadmapChapter.upsert({
        where: { courseId_order: { courseId, order: chapterOrder } },
        update: { title: ch.title, titleZh: ch.titleZh },
        create: { courseId, order: chapterOrder, title: ch.title, titleZh: ch.titleZh },
      });

      for (const t of ch.lessons) {
        order++;
        const lessonId = `rl-${slug}-${order}`;
        const lessonData = {
          courseId,
          order,
          topic: t.topic,
          topicZh: t.topicZh,
          description: `Khám phá chủ đề "${t.topic}" (${t.topicZh}) qua từ vựng, mẫu ngữ pháp và luyện nghe – nói – đọc – viết theo ngữ cảnh thực tế.`,
          icon: t.icon,
          // chapterId = nguồn sự thật; chapter / chapterOrder = cache cho học viên.
          chapterId: chapter.id,
          chapter: ch.title,
          chapterOrder,
          xpReward: 20,
        };
        await prisma.roadmapLesson.upsert({
          where: { id: lessonId },
          update: lessonData,
          create: { id: lessonId, ...lessonData },
        });
        lessonCount++;
      }
    }
  }

  // Tiến độ mẫu cho tài khoản test (đăng nhập bằng Google) để xem vòng tròn % và đủ trạng thái:
  //  - Bài 1–5: hoàn thành đủ 6 kỹ năng (vòng 100%).
  //  - Bài 6: đang học dở, mới xong 3/6 kỹ năng (vòng 50%, là bài "đang học").
  const ALL_SKILLS = ["VOCAB", "GRAMMAR", "LISTENING", "SPEAKING", "READING", "WRITING"];
  const demoProgress: { ord: number; completed: boolean; skillsDone: string[] }[] = [
    { ord: 1, completed: true, skillsDone: ALL_SKILLS },
    { ord: 2, completed: true, skillsDone: ALL_SKILLS },
    { ord: 3, completed: true, skillsDone: ALL_SKILLS },
    { ord: 4, completed: true, skillsDone: ALL_SKILLS },
    { ord: 5, completed: true, skillsDone: ALL_SKILLS },
    { ord: 6, completed: false, skillsDone: ["VOCAB", "GRAMMAR", "LISTENING"] },
  ];
  for (const p of demoProgress) {
    const lessonId = `rl-hsk1-${p.ord}`;
    const data = {
      completed: p.completed,
      skillsDone: p.skillsDone as Prisma.InputJsonValue,
      xpEarned: p.completed ? 20 : 0,
      completedAt: p.completed ? new Date() : null,
    };
    await prisma.roadmapProgress.upsert({
      where: { userId_lessonId: { userId: testUserId, lessonId } },
      update: data,
      create: { userId: testUserId, lessonId, ...data },
    });
  }

  console.log(`[roadmap] courses: ${courseCount}, lessons: ${lessonCount}, demo progress: ${demoProgress.length}`);
}

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("admin123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "dingdong1405edu@gmail.com" },
    update: {},
    create: {
      email: "dingdong1405edu@gmail.com",
      name: "Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      xp: 0,
      hearts: 5,
    },
  });
  console.log("Admin:", admin.email);

  // Demo learner
  const learnerHash = await bcrypt.hash("demo123456", 12);
  const learner = await prisma.user.upsert({
    where: { email: "demo@dingdong.vn" },
    update: {},
    create: {
      email: "demo@dingdong.vn",
      name: "Demo User",
      passwordHash: learnerHash,
      role: "LEARNER",
      xp: 120,
      hearts: 5,
      streakDays: 3,
    },
  });
  console.log("Learner:", learner.email);

  // ===== HSK 1 Vocab Units =====
  const unit1 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-1" },
    update: {},
    create: {
      id: "unit-hsk1-1",
      title: "Chào hỏi & Đại từ",
      titleZh: "问候与代词",
      hskLevel: HSKLevel.HSK1,
      order: 1,
    },
  });

  const unit2 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-2" },
    update: {},
    create: {
      id: "unit-hsk1-2",
      title: "Con số & Thời gian",
      titleZh: "数字与时间",
      hskLevel: HSKLevel.HSK1,
      order: 2,
    },
  });

  const unit3 = await prisma.vocabUnit.upsert({
    where: { id: "unit-hsk1-3" },
    update: {},
    create: {
      id: "unit-hsk1-3",
      title: "Gia đình & Con người",
      titleZh: "家庭与人物",
      hskLevel: HSKLevel.HSK1,
      order: 3,
    },
  });

  // Lessons for Unit 1
  const lessons1 = [
    {
      id: "lesson-u1-1",
      unitId: unit1.id,
      order: 1,
      title: "Xin chào & Cảm ơn",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "你好", vi: "Xin chào", pinyin: "nǐ hǎo" },
            { zh: "谢谢", vi: "Cảm ơn", pinyin: "xiè xiè" },
            { zh: "再见", vi: "Tạm biệt", pinyin: "zài jiàn" },
            { zh: "对不起", vi: "Xin lỗi", pinyin: "duì bu qǐ" },
          ],
        },
        {
          type: "toneSelect",
          word: "你好",
          pinyin: "nǐ hǎo",
          audio: null,
          question: "Từ '你好' có thanh điệu là gì?",
          options: ["Thanh 1+1", "Thanh 3+3", "Thanh 2+4", "Thanh 4+2"],
          correct: 1,
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Tạm biệt",
          answer: "再见",
          pinyin: "zài jiàn",
          options: ["再见", "你好", "谢谢", "不客气"],
        },
        {
          type: "pinyinMatch",
          pairs: [
            { zh: "你好", pinyin: "nǐ hǎo" },
            { zh: "谢谢", pinyin: "xiè xiè" },
            { zh: "再见", pinyin: "zài jiàn" },
          ],
        },
      ],
    },
    {
      id: "lesson-u1-2",
      unitId: unit1.id,
      order: 2,
      title: "Đại từ nhân xưng",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "我", vi: "Tôi", pinyin: "wǒ" },
            { zh: "你", vi: "Bạn", pinyin: "nǐ" },
            { zh: "他", vi: "Anh ấy", pinyin: "tā" },
            { zh: "她", vi: "Cô ấy", pinyin: "tā" },
            { zh: "我们", vi: "Chúng tôi", pinyin: "wǒ men" },
            { zh: "你们", vi: "Các bạn", pinyin: "nǐ men" },
          ],
        },
        {
          type: "translate",
          direction: "zh_to_vi",
          prompt: "他是学生。",
          answer: "Anh ấy là học sinh.",
          options: ["Anh ấy là học sinh.", "Cô ấy là giáo viên.", "Tôi là học sinh.", "Bạn là học sinh."],
        },
        {
          type: "sentenceOrder",
          words: ["是", "我", "学生"],
          answer: "我是学生",
          hint: "Tôi là học sinh",
        },
      ],
    },
  ];

  for (const lesson of lessons1) {
    await prisma.vocabLesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }

  // Lessons for Unit 2
  const lessons2 = [
    {
      id: "lesson-u2-1",
      unitId: unit2.id,
      order: 1,
      title: "Số từ 1-10",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "一", vi: "Một", pinyin: "yī" },
            { zh: "二", vi: "Hai", pinyin: "èr" },
            { zh: "三", vi: "Ba", pinyin: "sān" },
            { zh: "四", vi: "Bốn", pinyin: "sì" },
            { zh: "五", vi: "Năm", pinyin: "wǔ" },
            { zh: "六", vi: "Sáu", pinyin: "liù" },
          ],
        },
        {
          type: "toneSelect",
          word: "四",
          pinyin: "sì",
          question: "Từ '四' có thanh mấy?",
          options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"],
          correct: 3,
        },
      ],
    },
    {
      id: "lesson-u2-2",
      unitId: unit2.id,
      order: 2,
      title: "Ngày giờ cơ bản",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "今天", vi: "Hôm nay", pinyin: "jīn tiān" },
            { zh: "明天", vi: "Ngày mai", pinyin: "míng tiān" },
            { zh: "昨天", vi: "Hôm qua", pinyin: "zuó tiān" },
            { zh: "现在", vi: "Bây giờ", pinyin: "xiàn zài" },
          ],
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Hôm nay là thứ mấy?",
          answer: "今天是星期几？",
          options: ["今天是星期几？", "明天是几号？", "现在几点？", "昨天几号？"],
        },
      ],
    },
  ];

  for (const lesson of lessons2) {
    await prisma.vocabLesson.upsert({
      where: { id: lesson.id },
      update: {},
      create: lesson,
    });
  }

  // Lesson for Unit 3
  await prisma.vocabLesson.upsert({
    where: { id: "lesson-u3-1" },
    update: {},
    create: {
      id: "lesson-u3-1",
      unitId: unit3.id,
      order: 1,
      title: "Gia đình",
      exercises: [
        {
          type: "match",
          pairs: [
            { zh: "爸爸", vi: "Bố", pinyin: "bà ba" },
            { zh: "妈妈", vi: "Mẹ", pinyin: "mā ma" },
            { zh: "哥哥", vi: "Anh trai", pinyin: "gē ge" },
            { zh: "姐姐", vi: "Chị gái", pinyin: "jiě jie" },
            { zh: "弟弟", vi: "Em trai", pinyin: "dì di" },
            { zh: "妹妹", vi: "Em gái", pinyin: "mèi mei" },
          ],
        },
        {
          type: "translate",
          direction: "zh_to_vi",
          prompt: "我爸爸是老师。",
          answer: "Bố tôi là giáo viên.",
          options: ["Bố tôi là giáo viên.", "Mẹ tôi là bác sĩ.", "Anh tôi là học sinh.", "Em tôi là học sinh."],
        },
      ],
    },
  });

  // ===== HSK 1 Grammar Units =====
  const gunit1 = await prisma.grammarUnit.upsert({
    where: { id: "gunit-hsk1-1" },
    update: {},
    create: {
      id: "gunit-hsk1-1",
      title: "Câu khẳng định cơ bản",
      titleZh: "基本肯定句",
      hskLevel: HSKLevel.HSK1,
      order: 1,
    },
  });

  await prisma.grammarLesson.upsert({
    where: { id: "glesson-g1-1" },
    update: {},
    create: {
      id: "glesson-g1-1",
      unitId: gunit1.id,
      order: 1,
      title: "Câu với 是 (shì)",
      exercises: [
        {
          type: "fill_blank",
          sentence: "我___学生。",
          blank: "是",
          options: ["是", "有", "在", "叫"],
          hint: "Động từ 'là'",
        },
        {
          type: "sentence_order",
          words: ["老师", "是", "他"],
          answer: "他是老师",
          meaning: "Anh ấy là giáo viên",
        },
        {
          type: "translate",
          direction: "vi_to_zh",
          prompt: "Cô ấy là bác sĩ.",
          answer: "她是医生。",
          options: ["她是医生。", "他是老师。", "我是学生。", "你是医生。"],
        },
      ],
    },
  });

  // ===== Hanzi Characters =====
  const hanziData = [
    {
      id: "hanzi-ni",
      character: "你",
      pinyin: "nǐ",
      tone: 3,
      meaning: "Bạn, anh/chị/em (ngôi thứ hai)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 7,
      strokeOrder: { strokes: 7, notes: "phức hợp từ 人 và 尔" },
      examples: [
        { sentence: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào" },
        { sentence: "你是学生吗？", pinyin: "nǐ shì xuésheng ma?", meaning: "Bạn là học sinh à?" },
      ],
    },
    {
      id: "hanzi-wo",
      character: "我",
      pinyin: "wǒ",
      tone: 3,
      meaning: "Tôi, tao (ngôi thứ nhất)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 7,
      strokeOrder: { strokes: 7, notes: "gồm 7 nét" },
      examples: [
        { sentence: "我是学生。", pinyin: "wǒ shì xuésheng", meaning: "Tôi là học sinh." },
        { sentence: "我叫李明。", pinyin: "wǒ jiào Lǐ Míng", meaning: "Tôi tên là Lý Minh." },
      ],
    },
    {
      id: "hanzi-ta-m",
      character: "他",
      pinyin: "tā",
      tone: 1,
      meaning: "Anh ấy (ngôi thứ ba nam)",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 5,
      strokeOrder: { strokes: 5, notes: "bộ 人" },
      examples: [
        { sentence: "他是老师。", pinyin: "tā shì lǎoshī", meaning: "Anh ấy là giáo viên." },
      ],
    },
    {
      id: "hanzi-hao",
      character: "好",
      pinyin: "hǎo",
      tone: 3,
      meaning: "Tốt, được, hay",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 6,
      strokeOrder: { strokes: 6, notes: "bộ 女 + 子" },
      examples: [
        { sentence: "你好！", pinyin: "nǐ hǎo", meaning: "Xin chào!" },
        { sentence: "很好。", pinyin: "hěn hǎo", meaning: "Rất tốt." },
      ],
    },
    {
      id: "hanzi-zhong",
      character: "中",
      pinyin: "zhōng",
      tone: 1,
      meaning: "Giữa, Trung, Trung Quốc",
      hskLevel: HSKLevel.HSK1,
      strokeCount: 4,
      strokeOrder: { strokes: 4, notes: "4 nét cơ bản" },
      examples: [
        { sentence: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc" },
        { sentence: "中文", pinyin: "Zhōngwén", meaning: "Tiếng Trung" },
      ],
    },
  ];

  for (const hanzi of hanziData) {
    await prisma.hanziCharacter.upsert({
      where: { id: hanzi.id },
      update: {},
      create: hanzi,
    });
  }

  // ===== Reading Tests =====
  const reading1 = await prisma.readingTest.upsert({
    where: { id: "reading-hsk1-1" },
    update: {},
    create: {
      id: "reading-hsk1-1",
      title: "Giới thiệu bản thân",
      titleZh: "自我介绍",
      hskLevel: HSKLevel.HSK1,
      passage: "我叫李明，我是中国人。我是学生，我在北京大学学习。我有一个哥哥和一个妹妹。我的爸爸是老师，我的妈妈是医生。我喜欢学习汉语，汉语很有意思。",
      passagePinyin: "Wǒ jiào Lǐ Míng, wǒ shì Zhōngguórén. Wǒ shì xuésheng, wǒ zài Běijīng Dàxué xuéxí. Wǒ yǒu yī gè gēgē hé yī gè mèimei. Wǒ de bàba shì lǎoshī, wǒ de māma shì yīshēng. Wǒ xǐhuān xuéxí Hànyǔ, Hànyǔ hěn yǒu yìsi.",
      timeLimit: 600,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "rq1-1",
        type: QuestionType.MCQ,
        prompt: "李明是哪国人？",
        promptPinyin: "Lǐ Míng shì nǎ guó rén?",
        options: [
          { text: "中国人", pinyin: "Zhōngguórén" },
          { text: "越南人", pinyin: "Yuènánrén" },
          { text: "日本人", pinyin: "Rìběnrén" },
          { text: "韩国人", pinyin: "Hánguórén" },
        ],
        correctAnswer: { index: 0, text: "中国人" },
        explanation: "文中说'我是中国人'",
        readingId: reading1.id,
        order: 1,
      },
      {
        id: "rq1-2",
        type: QuestionType.MCQ,
        prompt: "李明的爸爸是什么职业？",
        promptPinyin: "Lǐ Míng de bàba shì shénme zhíyè?",
        options: [
          { text: "医生", pinyin: "yīshēng" },
          { text: "老师", pinyin: "lǎoshī" },
          { text: "学生", pinyin: "xuésheng" },
          { text: "工人", pinyin: "gōngrén" },
        ],
        correctAnswer: { index: 1, text: "老师" },
        explanation: "文中说'我的爸爸是老师'",
        readingId: reading1.id,
        order: 2,
      },
      {
        id: "rq1-3",
        type: QuestionType.TRUE_FALSE,
        prompt: "李明喜欢学习汉语。",
        promptPinyin: "Lǐ Míng xǐhuān xuéxí Hànyǔ.",
        correctAnswer: { value: true },
        explanation: "文中说'我喜欢学习汉语'",
        readingId: reading1.id,
        order: 3,
      },
    ],
  });

  const reading2 = await prisma.readingTest.upsert({
    where: { id: "reading-hsk1-2" },
    update: {},
    create: {
      id: "reading-hsk1-2",
      title: "Một ngày của tôi",
      titleZh: "我的一天",
      hskLevel: HSKLevel.HSK1,
      passage: "我每天七点起床。我先吃早饭，然后去学校。在学校，我上汉语课和数学课。中午我在学校吃午饭。下午三点放学。我回家以后先做作业，然后看电视。晚上九点我睡觉。",
      passagePinyin: "Wǒ měitiān qī diǎn qǐchuáng. Wǒ xiān chī zǎofàn, rán hòu qù xuéxiào. Zài xuéxiào, wǒ shàng Hànyǔ kè hé shùxué kè. Zhōngwǔ wǒ zài xuéxiào chī wǔfàn. Xiàwǔ sān diǎn fàngxué. Wǒ huí jiā yǐhòu xiān zuò zuòyè, rán hòu kàn diànshì. Wǎnshang jiǔ diǎn wǒ shuìjiào.",
      timeLimit: 600,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "rq2-1",
        type: QuestionType.MCQ,
        prompt: "作者每天几点起床？",
        options: [
          { text: "六点", pinyin: "liù diǎn" },
          { text: "七点", pinyin: "qī diǎn" },
          { text: "八点", pinyin: "bā diǎn" },
          { text: "九点", pinyin: "jiǔ diǎn" },
        ],
        correctAnswer: { index: 1, text: "七点" },
        explanation: "文中说'每天七点起床'",
        readingId: reading2.id,
        order: 1,
      },
      {
        id: "rq2-2",
        type: QuestionType.TRUE_FALSE,
        prompt: "作者下午放学后先看电视再做作业。",
        correctAnswer: { value: false },
        explanation: "文中说'先做作业，然后看电视'，顺序相反",
        readingId: reading2.id,
        order: 2,
      },
    ],
  });

  // ===== Listening Test =====
  await prisma.listeningTest.upsert({
    where: { id: "listening-hsk1-1" },
    update: {},
    create: {
      id: "listening-hsk1-1",
      title: "Hội thoại chào hỏi",
      hskLevel: HSKLevel.HSK1,
      audioUrl: "/audio/hsk1-greeting.mp3",
      transcript: "A: 你好！你叫什么名字？\nB: 你好！我叫王芳。你呢？\nA: 我叫张明。你是哪里人？\nB: 我是北京人。你呢？\nA: 我是上海人。很高兴认识你！\nB: 我也很高兴认识你！",
      timeLimit: 300,
    },
  });

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "lq1-1",
        type: QuestionType.MCQ,
        prompt: "女的叫什么名字？",
        promptPinyin: "Nǚ de jiào shénme míngzi?",
        options: [
          { text: "王芳", pinyin: "Wáng Fāng" },
          { text: "张明", pinyin: "Zhāng Míng" },
          { text: "李明", pinyin: "Lǐ Míng" },
          { text: "王明", pinyin: "Wáng Míng" },
        ],
        correctAnswer: { index: 0, text: "王芳" },
        explanation: "她说'我叫王芳'。",
        listeningId: "listening-hsk1-1",
        order: 1,
      },
      {
        id: "lq1-2",
        type: QuestionType.MCQ,
        prompt: "张明是哪里人？",
        promptPinyin: "Zhāng Míng shì nǎlǐ rén?",
        options: [
          { text: "北京人", pinyin: "Běijīngrén" },
          { text: "上海人", pinyin: "Shànghǎirén" },
          { text: "广州人", pinyin: "Guǎngzhōurén" },
          { text: "南京人", pinyin: "Nánjīngrén" },
        ],
        correctAnswer: { index: 1, text: "上海人" },
        explanation: "张明说'我是上海人'。",
        listeningId: "listening-hsk1-1",
        order: 2,
      },
      {
        id: "lq1-3",
        type: QuestionType.TRUE_FALSE,
        prompt: "王芳是北京人。",
        promptPinyin: "Wáng Fāng shì Běijīngrén.",
        correctAnswer: { value: true },
        explanation: "王芳说'我是北京人'。",
        listeningId: "listening-hsk1-1",
        order: 3,
      },
    ],
  });

  // ===== Writing Task =====
  await prisma.writingTask.upsert({
    where: { id: "writing-hsk1-1" },
    update: {},
    create: {
      id: "writing-hsk1-1",
      taskType: WritingTaskType.FREE,
      prompt: "Viết một đoạn văn ngắn giới thiệu bản thân bằng tiếng Trung. Bao gồm: tên, quốc tịch, nghề nghiệp, gia đình và sở thích.",
      promptZh: "用汉语写一段短文介绍你自己。包括：名字、国籍、职业、家庭和爱好。",
      minChars: 50,
      timeLimit: 900,
      hskLevel: HSKLevel.HSK1,
    },
  });

  // ===== Speaking Set =====
  await prisma.speakingSet.upsert({
    where: { id: "speaking-hsk1-1" },
    update: {},
    create: {
      id: "speaking-hsk1-1",
      title: "HSKK HSK 1 - Bài 1",
      hskLevel: HSKLevel.HSK1,
      part1Sentences: [
        { text: "你好，很高兴认识你。", pinyin: "Nǐ hǎo, hěn gāoxìng rènshi nǐ." },
        { text: "我叫李明，我是学生。", pinyin: "Wǒ jiào Lǐ Míng, wǒ shì xuésheng." },
        { text: "我喜欢学习汉语，汉语很有意思。", pinyin: "Wǒ xǐhuān xuéxí Hànyǔ, Hànyǔ hěn yǒu yìsi." },
      ],
      part2Passage: {
        text: "我叫王明，今年二十岁。我是大学生，在北京大学学习汉语。我的家在上海，我有爸爸、妈妈和一个妹妹。我喜欢打篮球和听音乐。",
        pinyin: "Wǒ jiào Wáng Míng, jīnnián èrshí suì. Wǒ shì dàxuéshēng, zài Běijīng Dàxué xuéxí Hànyǔ. Wǒ de jiā zài Shànghǎi, wǒ yǒu bàba, māma hé yī gè mèimei. Wǒ xǐhuān dǎ lánqiú hé tīng yīnyuè.",
      },
      part3Questions: [
        { question: "你叫什么名字？", pinyin: "Nǐ jiào shénme míngzi?" },
        { question: "你是哪国人？", pinyin: "Nǐ shì nǎ guó rén?" },
        { question: "你喜欢学习汉语吗？为什么？", pinyin: "Nǐ xǐhuān xuéxí Hànyǔ ma? Wèishénme?" },
      ],
    },
  });

  // ===== Học theo lộ trình (Course → RoadmapLesson) =====
  // Gán tiến độ mẫu cho tài khoản test đăng nhập bằng Google (dingdong1405edu@gmail.com).
  await seedRoadmap(admin.id);

  // ===== Bulk content authored in batch (prisma/seed-data/*.json) =====
  await loadSeedData();

  // Backfill per-word vocab content from legacy exercises so every lesson has words.
  await migrateVocabWords();

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
