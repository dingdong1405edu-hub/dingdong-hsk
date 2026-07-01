/**
 * Nạp TỪ VỰNG HSK3 vào lộ trình (Course HSK3 → 43 RoadmapLesson, mỗi bài 1 phần
 * VOCAB đã xuất bản). Cấu trúc theo PDF "BÁO CÁO TỔNG HỢP TỪ VỰNG HSK 3 CHI TIẾT
 * (43 BÀI HỌC)": 10 chương (4 chương giáo trình Bài 1–20, 2 chương chủ đề mở rộng
 * Bài 21–32, 4 chương theo vần Bài 33–43), tổng 599 từ.
 *
 * - Dữ liệu từ: prisma/seed-data/vocab-roadmap-HSK3.json (đã trích + đối soát;
 *   bỏ từ trùng trong cùng bài, sửa ví dụ không chứa từ khoá).
 * - Pinyin câu ví dụ tự sinh bằng pinyin-pro (giống cách HSK1/HSK2 đã làm).
 * - Idempotent: upsert chương theo (courseId, order) và bài theo id ổn định
 *   `rl-hsk3-<bai>` (tái dùng 12 bài cũ + tạo thêm 31 bài). KHÔNG xoá gì.
 *
 * Chạy: npx tsx prisma/load-roadmap-vocab-HSK3.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

// 10 chương. order = số chương (1..10). PHẢI khớp với prisma/seed.ts (HSK3).
const CHAPTERS: { order: number; title: string }[] = [
  { order: 1, title: "Phần I · Giáo trình HSK 3 (Bài 1–5)" },
  { order: 2, title: "Phần II · Giáo trình HSK 3 (Bài 6–10)" },
  { order: 3, title: "Phần III · Giáo trình HSK 3 (Bài 11–15)" },
  { order: 4, title: "Phần IV · Giáo trình HSK 3 (Bài 16–20)" },
  { order: 5, title: "Phần V · Chủ đề: Đời sống & Thiên nhiên" },
  { order: 6, title: "Phần VI · Chủ đề: Sinh hoạt & Xã hội" },
  { order: 7, title: "Phần VII · Từ vựng theo vần A–D" },
  { order: 8, title: "Phần VIII · Từ vựng theo vần F–L" },
  { order: 9, title: "Phần IX · Từ vựng theo vần M–W" },
  { order: 10, title: "Phần X · Từ vựng theo vần X–Z" },
];

// 43 bài: bai = order của bài (1..43); phan = order chương; topic (Chủ đề tiếng
// Việt); topicZh (tên bài 中文 — câu chủ đề cho Bài 1–20, nhãn chủ đề/vần cho
// Bài 21–43); icon. PHẢI khớp với prisma/seed.ts (HSK3).
const LESSON_META: { bai: number; phan: number; topic: string; topicZh: string; icon: string }[] = [
  { bai: 1,  phan: 1,  topic: "Kế hoạch cuối tuần",     topicZh: "周末你有什么打算？",               icon: "🗓️" },
  { bai: 2,  phan: 1,  topic: "Khi nào quay về?",       topicZh: "他什么时候回来？",                 icon: "🔙" },
  { bai: 3,  phan: 1,  topic: "Đồ vật trên bàn",        topicZh: "桌子上放着很多饮料",               icon: "🥤" },
  { bai: 4,  phan: 1,  topic: "Tiếp khách niềm nở",     topicZh: "她总是笑着跟客人说话",             icon: "😊" },
  { bai: 5,  phan: 1,  topic: "Càng ngày càng…",        topicZh: "我最近越来越胖了",                 icon: "⚖️" },
  { bai: 6,  phan: 2,  topic: "Bỗng dưng không thấy",   topicZh: "怎么突然找不到了？",               icon: "🔍" },
  { bai: 7,  phan: 2,  topic: "Quen biết & quan hệ",    topicZh: "我跟她都认识五年了",               icon: "👫" },
  { bai: 8,  phan: 2,  topic: "Đi đâu theo đó",         topicZh: "你去哪儿我就去哪儿",               icon: "🧭" },
  { bai: 9,  phan: 2,  topic: "Giỏi như người bản xứ",  topicZh: "她的汉语说得跟中国人一样好",       icon: "🗣️" },
  { bai: 10, phan: 2,  topic: "So sánh môn học",        topicZh: "数学比历史难多了",                 icon: "📐" },
  { bai: 11, phan: 3,  topic: "Nhớ tắt điều hòa",       topicZh: "别忘了把空调关了！",               icon: "❄️" },
  { bai: 12, phan: 3,  topic: "Cất đồ quan trọng",      topicZh: "把重要的东西放在我这儿吧",         icon: "🎒" },
  { bai: 13, phan: 3,  topic: "Tôi đi bộ về",           topicZh: "我是走回来的",                     icon: "🚶" },
  { bai: 14, phan: 3,  topic: "Mang trái cây qua đây",  topicZh: "你把水果拿过来！",                 icon: "🍉" },
  { bai: 15, phan: 3,  topic: "Không có vấn đề gì",     topicZh: "其他都没什么问题",                 icon: "✅" },
  { bai: 16, phan: 4,  topic: "Mệt muốn ngủ ngay",      topicZh: "我现在累得下了班就想睡觉",         icon: "😴" },
  { bai: 17, phan: 4,  topic: "Ai cũng có cách",        topicZh: "谁都有办法看好你的病",             icon: "🩺" },
  { bai: 18, phan: 4,  topic: "Tôi tin họ sẽ đồng ý",   topicZh: "我相信他们会同意的",               icon: "🤝" },
  { bai: 19, phan: 4,  topic: "Bạn không nhận ra à?",   topicZh: "你没看出来吗？",                   icon: "👀" },
  { bai: 20, phan: 4,  topic: "Bị ảnh hưởng",           topicZh: "我被他影响了！",                   icon: "🔄" },
  { bai: 21, phan: 5,  topic: "Giao thông & phương tiện", topicZh: "交通与工具",                     icon: "🚗" },
  { bai: 22, phan: 5,  topic: "Thời tiết & bốn mùa",    topicZh: "天气与四季",                       icon: "🌦️" },
  { bai: 23, phan: 5,  topic: "Trang phục & mua sắm",   topicZh: "服装与购物",                       icon: "👗" },
  { bai: 24, phan: 5,  topic: "Nhà cửa & đồ dùng",      topicZh: "家居与用品",                       icon: "🏠" },
  { bai: 25, phan: 5,  topic: "Động vật & thiên nhiên", topicZh: "动物与自然",                       icon: "🐼" },
  { bai: 26, phan: 5,  topic: "Cơ thể & sức khỏe",      topicZh: "身体与健康",                       icon: "🦷" },
  { bai: 27, phan: 6,  topic: "Ăn uống & thực phẩm",    topicZh: "饮食与食物",                       icon: "🍰" },
  { bai: 28, phan: 6,  topic: "Giải trí & sở thích",    topicZh: "娱乐与爱好",                       icon: "🎮" },
  { bai: 29, phan: 6,  topic: "Gia đình & quan hệ",     topicZh: "家庭与关系",                       icon: "👨‍👩‍👧" },
  { bai: 30, phan: 6,  topic: "Công việc & văn phòng",  topicZh: "工作与办公室",                     icon: "🏢" },
  { bai: 31, phan: 6,  topic: "Học tập & trường học",   topicZh: "学习与学校",                       icon: "📚" },
  { bai: 32, phan: 6,  topic: "Cảm xúc & trạng thái",   topicZh: "情绪与状态",                       icon: "😟" },
  { bai: 33, phan: 7,  topic: "Theo vần: A–B",          topicZh: "按拼音 A–B",                       icon: "🔤" },
  { bai: 34, phan: 7,  topic: "Theo vần: B–C",          topicZh: "按拼音 B–C",                       icon: "🔤" },
  { bai: 35, phan: 7,  topic: "Theo vần: C–D",          topicZh: "按拼音 C–D",                       icon: "🔤" },
  { bai: 36, phan: 8,  topic: "Theo vần: F–G",          topicZh: "按拼音 F–G",                       icon: "🔤" },
  { bai: 37, phan: 8,  topic: "Theo vần: H–J",          topicZh: "按拼音 H–J",                       icon: "🔤" },
  { bai: 38, phan: 8,  topic: "Theo vần: J–L",          topicZh: "按拼音 J–L",                       icon: "🔤" },
  { bai: 39, phan: 9,  topic: "Theo vần: M–P",          topicZh: "按拼音 M–P",                       icon: "🔤" },
  { bai: 40, phan: 9,  topic: "Theo vần: Q–S",          topicZh: "按拼音 Q–S",                       icon: "🔤" },
  { bai: 41, phan: 9,  topic: "Theo vần: S–W",          topicZh: "按拼音 S–W",                       icon: "🔤" },
  { bai: 42, phan: 10, topic: "Theo vần: X–Z",          topicZh: "按拼音 X–Z",                       icon: "🔤" },
  { bai: 43, phan: 10, topic: "Theo vần: Z",            topicZh: "按拼音 Z",                         icon: "🔤" },
];

type RawWord = { stt: number; hanzi: string; pinyin: string; meaning: string; exampleHanzi: string; exampleMeaning: string };
type RawLesson = { bai: number; words: RawWord[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "vocab-roadmap-HSK3.json");
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const lessonsByBai = new Map<number, RawWord[]>();
  for (const l of parsed.lessons) lessonsByBai.set(l.bai, l.words);

  // ── Kiểm tra dữ liệu trước khi ghi ──
  let totalWords = 0;
  for (const m of LESSON_META) {
    const words = lessonsByBai.get(m.bai);
    assert(words, `Thiếu dữ liệu cho Bài ${m.bai}`);
    assert(words.length >= 1, `Bài ${m.bai}: không có từ nào`);
    const seen = new Set<string>();
    for (const w of words) {
      for (const f of ["hanzi", "pinyin", "meaning", "exampleHanzi", "exampleMeaning"] as const) {
        assert(w[f] && String(w[f]).trim(), `Bài ${m.bai} STT ${w.stt}: trống trường ${f}`);
      }
      assert(!seen.has(w.hanzi), `Bài ${m.bai}: từ trùng trong cùng bài "${w.hanzi}"`);
      seen.add(w.hanzi);
    }
    totalWords += words.length;
  }
  // Đối chiếu: số bài có dữ liệu PHẢI bằng số bài trong meta (không thừa bài).
  assert(
    lessonsByBai.size === LESSON_META.length,
    `Dữ liệu có ${lessonsByBai.size} bài nhưng meta có ${LESSON_META.length} bài.`
  );
  console.log(`[check] OK — ${LESSON_META.length} bài, tổng ${totalWords} từ.`);

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK3" } });
  assert(course, "Không tìm thấy Course HSK3 (course-hsk3).");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  // An toàn: cảnh báo nếu đã có tiến độ học (upsert không xoá, nhưng để biết).
  const oldLessons = await prisma.roadmapLesson.findMany({ where: { courseId: course.id }, select: { id: true } });
  const progress = await prisma.roadmapProgress.count({ where: { lessonId: { in: oldLessons.map((l) => l.id) } } });
  console.log(`[info] Bài HSK3 hiện có: ${oldLessons.length}, tiến độ học: ${progress} dòng.`);

  // ── 10 chương ──
  const chapterIdByOrder = new Map<number, string>();
  for (const ch of CHAPTERS) {
    const row = await prisma.roadmapChapter.upsert({
      where: { courseId_order: { courseId: course.id, order: ch.order } },
      update: { title: ch.title, titleZh: "" },
      create: { courseId: course.id, order: ch.order, title: ch.title, titleZh: "" },
    });
    chapterIdByOrder.set(ch.order, row.id);
  }
  console.log(`[chapters] upsert ${CHAPTERS.length} chương.`);

  // ── 43 bài + phần VOCAB ──
  let lessonsDone = 0;
  let sectionsDone = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk3-${m.bai}`;
    const chapter = CHAPTERS.find((c) => c.order === m.phan)!;
    const chapterId = chapterIdByOrder.get(m.phan)!;
    const words = lessonsByBai.get(m.bai)!;
    const lessonData = {
      courseId: course.id,
      order: m.bai,
      topic: m.topic,
      topicZh: m.topicZh,
      description: `Bài ${m.bai}: ${m.topic} (${m.topicZh}) — học ${words.length} từ vựng HSK3 theo ngữ cảnh, kèm ví dụ.`,
      icon: m.icon,
      chapterId,
      chapter: chapter.title,
      chapterOrder: m.phan,
      xpReward: 20,
    };
    await prisma.roadmapLesson.upsert({
      where: { id: lessonId },
      update: lessonData,
      create: { id: lessonId, ...lessonData },
    });
    lessonsDone++;

    const content = {
      title: `Từ vựng — ${m.topicZh}`,
      words: words.map((w) => ({
        hanzi: w.hanzi.trim(),
        pinyin: w.pinyin.trim(),
        meaning: w.meaning.trim(),
        audioUrl: null as string | null,
        examples: [
          {
            hanzi: w.exampleHanzi.trim(),
            pinyin: toPinyin(w.exampleHanzi.trim()),
            meaning: w.exampleMeaning.trim(),
          },
        ],
      })),
    } as unknown as Prisma.InputJsonValue;

    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId, skill: "VOCAB" } },
      update: { content, order: 1, published: true, title: "" },
      create: { lessonId, skill: "VOCAB", order: 1, content, published: true },
    });
    sectionsDone++;
  }
  console.log(`[done] ${lessonsDone} bài, ${sectionsDone} phần VOCAB (đã xuất bản).`);

  // ── Tự kiểm tra lại từ DB ──
  const check = await prisma.roadmapLesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
    include: { sections: { where: { skill: "VOCAB" } } },
  });
  const withVocab = check.filter((l) => l.sections.length > 0);
  const wordSum = withVocab.reduce((n, l) => {
    const c = l.sections[0].content as any;
    return n + (Array.isArray(c?.words) ? c.words.length : 0);
  }, 0);
  console.log(`[verify] HSK3 bài=${check.length}, có VOCAB=${withVocab.length}, tổng từ=${wordSum}, publish=${withVocab.every((l) => l.sections[0].published)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
