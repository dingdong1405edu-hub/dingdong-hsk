/**
 * Nạp TỪ VỰNG HSK5 vào lộ trình (Course HSK5 → RoadmapLesson, mỗi bài 1 phần
 * VOCAB đã xuất bản). Nguồn: giáo trình đọc HSK5 (mỗi "Chương" = 1 bài).
 *
 * QUAN TRỌNG — bài = SỐ CHƯƠNG trong sách (KHÔNG đánh lại số liên tục), để các
 * chương gửi bổ sung sau (7–18…) chèn đúng vị trí, giữ nguyên thứ tự đọc:
 *
 *   Phần I  (order 1) · Chủ đề đời sống & xã hội — Bài 1–5   (từ vựng theo chủ đề)
 *   Phần II (order 2) · Câu chuyện & Bài đọc     — Bài 6, 19–24 (từ trích bài đọc)
 *     Chương 6  → Bài 6:  Nguồn gốc đêm Giao thừa (除夕的由来)
 *     Chương 19 → Bài 19: Bánh củ cải quê nhà     (家乡的萝卜饼)
 *     Chương 20 → Bài 20: Quầy truyện tranh        (小人书摊)
 *     Chương 21 → Bài 21: Ông chú chữ Hán người Mỹ (汉字叔叔)
 *     Chương 22 → Bài 22: Đọc sách và suy ngẫm     (阅读与思考)
 *     Chương 23 → Bài 23: Buông tay                (放手)
 *     Chương 24 → Bài 24: Dạy học tình nguyện      (支教行动)
 *   (Bài 7–18 chưa có dữ liệu — sẽ chèn vào Phần II khi có.)
 *
 * - Số từ MỖI BÀI khác nhau (15 → 44); loader chỉ assert >= 1.
 * - Dữ liệu từ: prisma/seed-data/vocab-roadmap-HSK5.json (đã trích + đối soát;
 *   sửa pinyin 沟通 gōutōng, 观点 guāndiǎn; vá vài câu ví dụ PDF không chứa từ khoá:
 *   册/隐约/交往/鼓掌).
 * - Pinyin câu ví dụ tự sinh bằng pinyin-pro (giống HSK1/HSK2/HSK3).
 * - Idempotent: upsert chương theo (courseId, order) và bài theo id ổn định
 *   `rl-hsk5-<bai>`. DỌN các bài KHÔNG nằm trong LESSON_META & chương rỗng —
 *   nhưng CHỈ khi không có tiến độ học (nếu có thì báo lỗi, không xoá).
 * - seed.ts CHỈ khai báo Phần I (Bài 1–5) vì seedRoadmap đánh id theo bộ đếm chạy
 *   (không tạo được id ngắt quãng như rl-hsk5-19); Phần II do loader này sở hữu.
 *   db:seed vẫn an toàn: nó chỉ động tới Bài 1–5, không đụng Bài 6+.
 *
 * Chạy: npx tsx prisma/load-roadmap-vocab-HSK5.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

// 2 chương. order = số Phần. Phần I khớp prisma/seed.ts (HSK5); Phần II do loader
// này sở hữu (seed không khai báo — xem chú thích đầu file).
const CHAPTERS: { order: number; title: string }[] = [
  { order: 1, title: "Phần I · Chủ đề đời sống & xã hội (Bài 1–5)" },
  { order: 2, title: "Phần II · Câu chuyện & Bài đọc" },
];

// bai = SỐ CHƯƠNG trong sách (ngắt quãng cho phép: 7–18 sẽ bổ sung sau);
// phan = order chương; topic (tiếng Việt); topicZh (中文); icon.
// Bài 1–5 PHẢI khớp với prisma/seed.ts (HSK5).
const LESSON_META: { bai: number; phan: number; topic: string; topicZh: string; icon: string }[] = [
  { bai: 1,  phan: 1, topic: "Tình yêu và Hôn nhân",   topicZh: "爱情与婚姻", icon: "💑" },
  { bai: 2,  phan: 1, topic: "Tình bạn chân chính",    topicZh: "真正的友谊", icon: "🤝" },
  { bai: 3,  phan: 1, topic: "Thái độ sống",           topicZh: "人生态度",   icon: "🌱" },
  { bai: 4,  phan: 1, topic: "Nghệ thuật và Văn hóa",  topicZh: "艺术与文化", icon: "🎨" },
  { bai: 5,  phan: 1, topic: "Công việc và Sự nghiệp", topicZh: "工作与事业", icon: "💼" },
  { bai: 6,  phan: 2, topic: "Nguồn gốc đêm Giao thừa", topicZh: "除夕的由来", icon: "🧨" },
  { bai: 19, phan: 2, topic: "Bánh củ cải quê nhà",    topicZh: "家乡的萝卜饼", icon: "🥟" },
  { bai: 20, phan: 2, topic: "Quầy truyện tranh",      topicZh: "小人书摊",   icon: "📚" },
  { bai: 21, phan: 2, topic: "Ông chú chữ Hán người Mỹ", topicZh: "汉字叔叔", icon: "🔡" },
  { bai: 22, phan: 2, topic: "Đọc sách và suy ngẫm",   topicZh: "阅读与思考", icon: "🤔" },
  { bai: 23, phan: 2, topic: "Buông tay",              topicZh: "放手",       icon: "🕊️" },
  { bai: 24, phan: 2, topic: "Dạy học tình nguyện",    topicZh: "支教行动",   icon: "🏫" },
];

type RawWord = { stt: number; hanzi: string; pinyin: string; meaning: string; exampleHanzi: string; exampleMeaning: string };
type RawLesson = { bai: number; words: RawWord[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "vocab-roadmap-HSK5.json");
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
      // Ví dụ PHẢI chứa từ khoá (bắt lỗi câu minh hoạ lệch).
      assert(w.exampleHanzi.includes(w.hanzi), `Bài ${m.bai} "${w.hanzi}": ví dụ không chứa từ khoá`);
    }
    totalWords += words.length;
  }
  assert(
    lessonsByBai.size === LESSON_META.length,
    `Dữ liệu có ${lessonsByBai.size} bài nhưng meta có ${LESSON_META.length} bài.`
  );
  console.log(`[check] OK — ${LESSON_META.length} bài, tổng ${totalWords} từ.`);

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK5" } });
  assert(course, "Không tìm thấy Course HSK5 (course-hsk5).");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  const validBai = new Set(LESSON_META.map((m) => m.bai));
  const validChapterOrder = new Set(CHAPTERS.map((c) => c.order));

  // ── An toàn: cảnh báo nếu đã có tiến độ học ──
  const oldLessons = await prisma.roadmapLesson.findMany({ where: { courseId: course.id }, select: { id: true, order: true } });
  const progress = await prisma.roadmapProgress.count({ where: { lessonId: { in: oldLessons.map((l) => l.id) } } });
  console.log(`[info] Bài HSK5 hiện có: ${oldLessons.length}, tiến độ học: ${progress} dòng.`);

  // ── 1 chương ──
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

  // ── 5 bài + phần VOCAB ──
  let lessonsDone = 0;
  let sectionsDone = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk5-${m.bai}`;
    const chapter = CHAPTERS.find((c) => c.order === m.phan)!;
    const chapterId = chapterIdByOrder.get(m.phan)!;
    const words = lessonsByBai.get(m.bai)!;
    const lessonData = {
      courseId: course.id,
      order: m.bai,
      topic: m.topic,
      topicZh: m.topicZh,
      description: `Bài ${m.bai}: ${m.topic} (${m.topicZh}) — học ${words.length} từ vựng HSK5 theo ngữ cảnh, kèm ví dụ.`,
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

  // ── Dọn bài placeholder thừa (order > 5) & chương rỗng ──
  // An toàn: KHÔNG xoá nếu bài có tiến độ học (báo lỗi để người dùng quyết định).
  const staleLessons = oldLessons.filter((l) => !validBai.has(l.order));
  if (staleLessons.length) {
    const staleIds = staleLessons.map((l) => l.id);
    const staleProgress = await prisma.roadmapProgress.count({ where: { lessonId: { in: staleIds } } });
    assert(
      staleProgress === 0,
      `Có ${staleProgress} dòng tiến độ trên ${staleLessons.length} bài placeholder cũ (${staleIds.join(", ")}); KHÔNG xoá tự động — hãy xử lý thủ công.`
    );
    await prisma.roadmapSection.deleteMany({ where: { lessonId: { in: staleIds } } });
    await prisma.roadmapLesson.deleteMany({ where: { id: { in: staleIds } } });
    console.log(`[cleanup] xoá ${staleLessons.length} bài placeholder cũ (order > 5): ${staleIds.join(", ")}.`);
  }
  const staleChapters = await prisma.roadmapChapter.findMany({
    where: { courseId: course.id, order: { notIn: [...validChapterOrder] } },
    include: { _count: { select: { lessons: true } } },
  });
  const emptyChapters = staleChapters.filter((c) => c._count.lessons === 0);
  if (emptyChapters.length) {
    await prisma.roadmapChapter.deleteMany({ where: { id: { in: emptyChapters.map((c) => c.id) } } });
    console.log(`[cleanup] xoá ${emptyChapters.length} chương rỗng cũ (order > ${CHAPTERS.length}).`);
  }

  // ── Tự kiểm tra lại từ DB ──
  const check = await prisma.roadmapLesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
    include: { sections: { where: { skill: "VOCAB" } } },
  });
  const withVocab = check.filter((l) => l.sections.length > 0);
  const wordSum = withVocab.reduce((n, l) => {
    const c = l.sections[0].content as unknown as { words?: unknown[] };
    return n + (Array.isArray(c?.words) ? c.words.length : 0);
  }, 0);
  console.log(`[verify] HSK5 bài=${check.length}, có VOCAB=${withVocab.length}, tổng từ=${wordSum}, publish=${withVocab.every((l) => l.sections[0].published)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
