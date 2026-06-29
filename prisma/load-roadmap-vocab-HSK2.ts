/**
 * Nạp TỪ VỰNG HSK2 vào lộ trình (Course HSK2 → 35 RoadmapLesson, mỗi bài 1 phần
 * VOCAB đã xuất bản). Cấu trúc theo PDF "TỪ VỰNG HSK2 — 35 BÀI": 12 chương
 * (Phần I–XII), 35 bài × 17 từ = 595 từ.
 *
 * - Dữ liệu từ: prisma/seed-data/vocab-roadmap-HSK2.json (do workflow trích + đối soát).
 * - Pinyin câu ví dụ tự sinh bằng pinyin-pro (giống cách HSK1 đã làm).
 * - Idempotent: upsert chương theo (courseId, order) và bài theo id ổn định
 *   `rl-hsk2-<bai>` (tái dùng 15 bài rỗng cũ + tạo thêm 20 bài). KHÔNG xoá gì.
 *
 * Chạy: npx tsx prisma/load-roadmap-vocab-HSK2.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

// 12 chương = 12 Phần trong PDF. order = số Phần (1..12).
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

// 35 bài: bai = order của bài; phan = order chương; topic (Chủ đề tiếng Việt);
// topicZh (Tên bài 中文); icon.
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

type RawWord = { stt: number; hanzi: string; pinyin: string; meaning: string; exampleHanzi: string; exampleMeaning: string };
type RawLesson = { bai: number; words: RawWord[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "vocab-roadmap-HSK2.json");
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const lessonsByBai = new Map<number, RawWord[]>();
  for (const l of parsed.lessons) lessonsByBai.set(l.bai, l.words);

  // ── Kiểm tra dữ liệu trước khi ghi ──
  let totalWords = 0;
  for (const m of LESSON_META) {
    const words = lessonsByBai.get(m.bai);
    assert(words, `Thiếu dữ liệu cho Bài ${m.bai}`);
    assert(words.length === 17, `Bài ${m.bai}: có ${words.length} từ (cần 17)`);
    for (const w of words) {
      for (const f of ["hanzi", "pinyin", "meaning", "exampleHanzi", "exampleMeaning"] as const) {
        assert(w[f] && String(w[f]).trim(), `Bài ${m.bai} STT ${w.stt}: trống trường ${f}`);
      }
    }
    totalWords += words.length;
  }
  assert(totalWords === 595, `Tổng từ = ${totalWords} (cần 595)`);
  console.log(`[check] OK — 35 bài × 17 từ = ${totalWords} từ.`);

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK2" } });
  assert(course, "Không tìm thấy Course HSK2 (course-hsk2).");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  // An toàn: cảnh báo nếu đã có tiến độ học (upsert không xoá, nhưng để biết).
  const lessonIds = LESSON_META.map((m) => `rl-hsk2-${m.bai}`);
  const oldLessons = await prisma.roadmapLesson.findMany({ where: { courseId: course.id }, select: { id: true } });
  const progress = await prisma.roadmapProgress.count({ where: { lessonId: { in: oldLessons.map((l) => l.id) } } });
  console.log(`[info] Bài HSK2 hiện có: ${oldLessons.length}, tiến độ học: ${progress} dòng.`);

  // ── 12 chương ──
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

  // ── 35 bài + phần VOCAB ──
  let lessonsDone = 0;
  let sectionsDone = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk2-${m.bai}`;
    const chapter = CHAPTERS.find((c) => c.order === m.phan)!;
    const chapterId = chapterIdByOrder.get(m.phan)!;
    const lessonData = {
      courseId: course.id,
      order: m.bai,
      topic: m.topic,
      topicZh: m.topicZh,
      description: `Bài ${m.bai}: ${m.topic} (${m.topicZh}) — học 17 từ vựng HSK2 theo ngữ cảnh, kèm ví dụ.`,
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

    const words = lessonsByBai.get(m.bai)!.map((w) => ({
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
    }));
    const content = { title: `Từ vựng — ${m.topicZh}`, words } as unknown as Prisma.InputJsonValue;

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
  console.log(`[verify] HSK2 bài=${check.length}, có VOCAB=${withVocab.length}, tổng từ=${wordSum}, publish=${withVocab.every((l) => l.sections[0].published)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
