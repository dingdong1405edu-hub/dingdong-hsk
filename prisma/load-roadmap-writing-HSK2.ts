/**
 * Nạp LUYỆN VIẾT HSK2 vào lộ trình (Course HSK2 → 35 RoadmapLesson, mỗi bài thêm 1
 * phần WRITING đã xuất bản). Dạng "连词成句" (sắp xếp từ thành câu) — chính là format
 * thi VIẾT HSK2. Bám theo giáo trình PDF "LUYỆN VIẾT HSK2 (连词成句)": 35 bài × 3 câu.
 *
 * - Dữ liệu: prisma/seed-data/writing-roadmap-HSK2.json
 *   Shape: { lessons: [{ bai, topic, topicZh, sentences: [{ words, answer, translation }] }] }
 * - content lưu dạng { mode:"reorder", title, sentences } (xem writingReorderContentSchema)
 *   → RoadmapWritingPlayer chấm tự động (sentence_order), KHÔNG dùng AI.
 * - Xác thực ĐÚNG cách UI chấm: chosen.join("") === answer (bỏ dấu câu) ⇒ các mảnh
 *   "words" phải xếp lại đúng bằng answer (không dấu). Câu nào không xếp được → loại +
 *   cảnh báo (KHÔNG abort).
 * - KHÔNG phá bài đã có: lesson upsert update rỗng (chỉ tạo nếu thiếu). Chỉ phần
 *   WRITING (order=6) được ghi đè. Idempotent. KHÔNG xoá gì.
 *
 * Chạy: npx tsx prisma/load-roadmap-writing-HSK2.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// 12 chương = 12 Phần (đồng bộ với loader từ vựng/ngữ pháp).
const CHAPTERS: { order: number; title: string }[] = [
  { order: 1, title: "Phần I · Sở thích, du lịch & số lượng" },
  { order: 2, title: "Phần II · Thói quen & sức khỏe" },
  { order: 3, title: "Phần III · Mô tả đồ vật & vị trí" },
  { order: 4, title: "Phần IV · Công việc & quan hệ" },
  { order: 5, title: "Phần V · Mua sắm" },
  { order: 6, title: "Phần VI · Ăn uống & lý do" },
  { order: 7, title: "Phần VII · Khoảng cách & đi lại" },
  { order: 8, title: "Phần VIII · Quyết định & yêu cầu" },
  { order: 9, title: "Phần IX · Học tập & kết quả" },
  { order: 10, title: "Phần X · So sánh & đánh giá" },
  { order: 11, title: "Phần XI · Trạng thái & trải nghiệm" },
  { order: 12, title: "Phần XII · Sự kiện sắp tới & ôn tập" },
];

// 35 bài (đồng bộ với loader từ vựng/ngữ pháp) — dùng khi phải TẠO bài còn thiếu.
const LESSON_META: { bai: number; phan: number; topic: string; topicZh: string; icon: string }[] = [
  { bai: 1,  phan: 1,  topic: "Sở thích & du lịch",        topicZh: "我想去旅游",         icon: "🧳" },
  { bai: 2,  phan: 1,  topic: "Lựa chọn tốt nhất",          topicZh: "去北京旅游最好",     icon: "🌏" },
  { bai: 3,  phan: 1,  topic: "Số lượng ước lượng",         topicZh: "你要几个？多少钱？", icon: "🔢" },
  { bai: 4,  phan: 2,  topic: "Thói quen hằng ngày",        topicZh: "我每天六点起床",     icon: "⏰" },
  { bai: 5,  phan: 2,  topic: "Hỏi thăm sức khỏe",          topicZh: "你是不是病了？",     icon: "🤒" },
  { bai: 6,  phan: 2,  topic: "Tâm trạng & cảm giác",       topicZh: "我有点儿累",         icon: "😟" },
  { bai: 7,  phan: 3,  topic: "Mô tả & sở hữu",             topicZh: "左边红色的是我的",   icon: "🎨" },
  { bai: 8,  phan: 3,  topic: "Hành động ngắn",             topicZh: "等我一下",           icon: "✋" },
  { bai: 9,  phan: 3,  topic: "Cảm thán",                   topicZh: "这个真漂亮！",       icon: "😍" },
  { bai: 10, phan: 4,  topic: "Giới thiệu & quen biết",     topicZh: "我来介绍一下",       icon: "🤝" },
  { bai: 11, phan: 4,  topic: "Công việc & giúp đỡ",        topicZh: "他帮我介绍了工作",   icon: "💼" },
  { bai: 12, phan: 4,  topic: "Nhấn mạnh thông tin",        topicZh: "我是去年来的",       icon: "📌" },
  { bai: 13, phan: 4,  topic: "Thời điểm & hoàn thành",     topicZh: "下班的时候",         icon: "🕕" },
  { bai: 14, phan: 5,  topic: "Mua sắm & đề nghị",          topicZh: "买这件衣服吧",       icon: "🛍️" },
  { bai: 15, phan: 5,  topic: "Giá cả & mặc cả",            topicZh: "太贵了，便宜点儿吧", icon: "💰" },
  { bai: 16, phan: 5,  topic: "Lưỡng lự",                   topicZh: "我还想再看看",       icon: "🤔" },
  { bai: 17, phan: 6,  topic: "Ăn uống & hỏi lý do",        topicZh: "你怎么不吃了？",     icon: "🍽️" },
  { bai: 18, phan: 6,  topic: "Nhân quả",                   topicZh: "因为太辣，所以…",    icon: "🌶️" },
  { bai: 19, phan: 6,  topic: "Nhấn mạnh toàn thể",         topicZh: "个个都好吃",         icon: "🍱" },
  { bai: 20, phan: 7,  topic: "Khoảng cách",                topicZh: "你家离公司远吗？",   icon: "📏" },
  { bai: 21, phan: 7,  topic: "Đi lại & ngữ khí",           topicZh: "我还在等车呢",       icon: "🚌" },
  { bai: 22, phan: 7,  topic: "Lộ trình & hướng",           topicZh: "从家到公司",         icon: "🗺️" },
  { bai: 23, phan: 8,  topic: "Suy nghĩ & quyết định",      topicZh: "让我想想再说",       icon: "💭" },
  { bai: 24, phan: 8,  topic: "Đề nghị lịch sự",            topicZh: "你帮我一下，好吗？", icon: "🙏" },
  { bai: 25, phan: 8,  topic: "Nhắc nhở & tìm đồ",          topicZh: "别找了，在桌子上呢", icon: "🔍" },
  { bai: 26, phan: 9,  topic: "Kế hoạch học tập",           topicZh: "我打算好好复习",     icon: "📚" },
  { bai: 27, phan: 9,  topic: "Kết quả công việc",          topicZh: "题太多，我没做完",   icon: "✍️" },
  { bai: 28, phan: 9,  topic: "Tiếp nhận thông tin",        topicZh: "我听懂了，也看见了", icon: "👂" },
  { bai: 29, phan: 9,  topic: "Thứ tự",                     topicZh: "这是第几课？",       icon: "🔢" },
  { bai: 30, phan: 10, topic: "So sánh",                    topicZh: "他比我大三岁",       icon: "⚖️" },
  { bai: 31, phan: 10, topic: "Đánh giá hành động",         topicZh: "你穿得太少了",       icon: "👕" },
  { bai: 32, phan: 10, topic: "Suy đoán",                   topicZh: "明天可能会下雨",     icon: "🌧️" },
  { bai: 33, phan: 11, topic: "Trạng thái tồn tại",         topicZh: "门开着呢",           icon: "🚪" },
  { bai: 34, phan: 11, topic: "Trải nghiệm quá khứ",        topicZh: "你看过那个电影吗？", icon: "🎬" },
  { bai: 35, phan: 12, topic: "Sự kiện sắp tới & ôn tập",   topicZh: "新年就要到了",       icon: "🎉" },
];

interface RawSentence { words: string[]; answer: string; translation?: string; pinyin?: string; explanation?: string }
interface RawLesson { bai: number; topic?: string; topicZh?: string; sentences: RawSentence[] }

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const PUNCT = /[。，、．！？；：“”‘’（）【】「」《》〈〉()[\]{}.,!?;:"'`~·…—\s]/g;
const stripPunct = (s: string) => s.normalize("NFC").replace(PUNCT, "");

/** Các mảnh `words` có xếp được thành đúng `target` (không dấu) không? (đệ quy quay lui) */
function tileable(words: string[], target: string): boolean {
  const tiles = words.map(stripPunct);
  const bt = (rem: string, used: number): boolean => {
    if (rem === "") return used === (1 << tiles.length) - 1;
    for (let i = 0; i < tiles.length; i++) {
      if (used & (1 << i)) continue;
      if (tiles[i] && rem.startsWith(tiles[i]) && bt(rem.slice(tiles[i].length), used | (1 << i))) return true;
    }
    return false;
  };
  return bt(target, 0);
}

/** Làm sạch + xác thực 1 câu "连词成句"; trả null nếu không tự xếp được (loại + cảnh báo). */
function sanitizeSentence(s: RawSentence, where: string, warns: string[]): RawSentence | null {
  const words = (Array.isArray(s.words) ? s.words.map((w) => String(w).trim()) : []).filter(Boolean);
  const answer = String(s.answer ?? "").trim();
  if (words.length < 2 || !answer) return (warns.push(`${where}: thiếu words/answer`), null);
  const target = stripPunct(answer);
  if (!tileable(words, target))
    return (warns.push(`${where}: mảnh ("${words.join("|")}") không xếp thành "${answer}"`), null);
  return {
    words,
    answer, // giữ dấu câu (đẹp cho PDF/feedback); player tự bỏ dấu khi chấm
    translation: s.translation ? String(s.translation).trim() : "",
    ...(s.pinyin ? { pinyin: String(s.pinyin).trim() } : {}),
    ...(s.explanation ? { explanation: String(s.explanation).trim() } : {}),
  };
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "writing-roadmap-HSK2.json");
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const byBai = new Map<number, RawLesson>();
  for (const l of parsed.lessons) byBai.set(l.bai, l);

  // ── Làm sạch + xác thực (câu không xếp được sẽ bị loại + cảnh báo, KHÔNG abort) ──
  const warns: string[] = [];
  let totalSentences = 0;
  const cleanByBai = new Map<number, RawSentence[]>();
  for (const m of LESSON_META) {
    const l = byBai.get(m.bai);
    assert(l && Array.isArray(l.sentences) && l.sentences.length > 0, `Thiếu câu viết cho Bài ${m.bai}`);
    const kept = l.sentences
      .map((s, i) => sanitizeSentence(s, `Bài ${m.bai} câu ${i + 1}`, warns))
      .filter((s): s is RawSentence => s !== null);
    totalSentences += l.sentences.length;
    assert(kept.length > 0, `Bài ${m.bai}: không còn câu viết hợp lệ`);
    cleanByBai.set(m.bai, kept);
  }
  const keptSentences = [...cleanByBai.values()].reduce((n, ss) => n + ss.length, 0);
  console.log(`[check] ${LESSON_META.length} bài, ${keptSentences}/${totalSentences} câu "连词成句" hợp lệ.`);
  if (warns.length) {
    console.warn(`[warn] Loại ${warns.length} câu không tự xếp được:`);
    for (const w of warns) console.warn(`   - ${w}`);
  }

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK2" } });
  assert(course, "Không tìm thấy Course HSK2.");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  // ── 12 chương (idempotent) ──
  const chapterIdByOrder = new Map<number, string>();
  for (const ch of CHAPTERS) {
    const row = await prisma.roadmapChapter.upsert({
      where: { courseId_order: { courseId: course.id, order: ch.order } },
      update: { title: ch.title },
      create: { courseId: course.id, order: ch.order, title: ch.title, titleZh: "" },
    });
    chapterIdByOrder.set(ch.order, row.id);
  }

  // ── 35 bài: KHÔNG đụng bài đã có (update rỗng), chỉ tạo nếu thiếu ──
  let lessonsCreated = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk2-${m.bai}`;
    const chapter = CHAPTERS.find((c) => c.order === m.phan)!;
    const chapterId = chapterIdByOrder.get(m.phan)!;
    const before = await prisma.roadmapLesson.findUnique({ where: { id: lessonId } });
    await prisma.roadmapLesson.upsert({
      where: { id: lessonId },
      update: {},
      create: {
        id: lessonId,
        courseId: course.id,
        order: m.bai,
        topic: m.topic,
        topicZh: m.topicZh,
        description: `Bài ${m.bai}: ${m.topic} (${m.topicZh}).`,
        icon: m.icon,
        chapterId,
        chapter: chapter.title,
        chapterOrder: m.phan,
        xpReward: 20,
      },
    });
    if (!before) lessonsCreated++;
  }
  console.log(`[lessons] ${LESSON_META.length} bài sẵn sàng (tạo mới ${lessonsCreated}).`);

  // ── 35 phần WRITING (order=6 — Viết là kỹ năng thứ 6 trong SKILL_META, đã xuất bản) ──
  let sectionsDone = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk2-${m.bai}`;
    const sentences = cleanByBai.get(m.bai)!;
    const content = {
      mode: "reorder",
      title: `Luyện viết — ${m.topicZh}`,
      sentences,
    } as unknown as Prisma.InputJsonValue;

    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId, skill: "WRITING" } },
      update: { content, order: 6, published: true, title: "" },
      create: { lessonId, skill: "WRITING", order: 6, content, published: true },
    });
    sectionsDone++;
  }
  console.log(`[done] ${sectionsDone} phần WRITING (连词成句, đã xuất bản).`);

  // ── Tự kiểm tra lại từ DB ──
  const check = await prisma.roadmapLesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
    include: { sections: { where: { skill: "WRITING" } } },
  });
  const withWriting = check.filter((l) => l.sections.length > 0);
  const senSum = withWriting.reduce((n, l) => {
    const c = l.sections[0].content as unknown as { sentences?: unknown[] };
    return n + (Array.isArray(c?.sentences) ? c.sentences.length : 0);
  }, 0);
  console.log(
    `[verify] HSK2 bài=${check.length}, có WRITING=${withWriting.length}, tổng câu=${senSum}, publish=${withWriting.every((l) => l.sections[0].published)}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
