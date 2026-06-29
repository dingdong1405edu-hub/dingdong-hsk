/**
 * Nạp NGỮ PHÁP HSK2 vào lộ trình (Course HSK2 → 35 RoadmapLesson, mỗi bài thêm 1
 * phần GRAMMAR đã xuất bản). Cấu trúc bám theo giáo trình PDF "NGỮ PHÁP HSK2 —
 * 35 BÀI": 12 chương (Phần I–XII), 35 bài, 71 điểm ngữ pháp.
 *
 * - Dữ liệu: prisma/seed-data/grammar-roadmap-HSK2.json (workflow soạn + thẩm định).
 *   Shape: { lessons: [{ bai, sections: GrammarSection[] }] }. Mỗi section là 1 điểm
 *   ngữ pháp (lý thuyết: structure/breakdown/explanation/usage/mistakes/examples +
 *   exercises: fill_blank / sentence_order / translate).
 * - content lưu dạng v3 GrammarLessonContent: { version:3, sections, test } để khớp
 *   parseGrammarContent + GrammarFlow (roadmap dùng showTest=false nên test rỗng).
 * - Pinyin câu ví dụ: ưu tiên pinyin sẵn có; thiếu thì tự sinh bằng pinyin-pro.
 * - KHÔNG phá bài đã có: lesson upsert với update rỗng (chỉ tạo nếu thiếu, giữ
 *   nguyên metadata do loader từ vựng đặt). Chỉ phần GRAMMAR (order=2) được ghi đè.
 * - Idempotent. KHÔNG xoá gì.
 *
 * Chạy: npx tsx prisma/load-roadmap-grammar-HSK2.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

// 12 chương = 12 Phần trong PDF (đồng bộ với load-roadmap-vocab-HSK2.ts).
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

// 35 bài (đồng bộ với load-roadmap-vocab-HSK2.ts) — dùng khi phải TẠO bài còn thiếu.
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

const PASS_THRESHOLD = 60;

interface RawExercise { type: string; [k: string]: unknown }
interface RawExample { situation?: string; hanzi: string; pinyin?: string; meaning: string; note?: string }
interface RawSection {
  id: string;
  title: string;
  titleZh?: string;
  structure?: string;
  breakdown?: unknown[];
  explanation: string;
  usage?: string;
  mistakes?: unknown[];
  examples: RawExample[];
  exercises: RawExercise[];
}
interface RawLesson { bai: number; sections: RawSection[] }

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const PUNCT = /[。，、．！？；：“”‘’（）【】「」《》〈〉()[\]{}.,!?;:"'`~·…—\-\s]/g;
const stripPunct = (s: string) => s.normalize("NFC").replace(PUNCT, "");
const sortChars = (s: string) => [...s].sort().join("");

/**
 * Làm sạch + xác thực 1 bài tập theo ĐÚNG cách UI chấm:
 *  - fill_blank: UI so opt === blank; câu tách theo "___"; blank phải ∈ options.
 *  - sentence_order: UI so chosen.join("") === answer (KHÔNG chuẩn hoá!) → answer
 *    PHẢI không dấu câu và đúng là các mảnh "words" ghép lại (đa tập ký tự khớp).
 *  - translate: UI so opt === answer; answer phải ∈ options.
 * Trả về exercise đã sạch, hoặc null nếu không tự giải được (sẽ bị loại + cảnh báo).
 */
function sanitizeExercise(ex: RawExercise, where: string, warns: string[]): RawExercise | null {
  if (ex.type === "fill_blank") {
    const sentence = String(ex.sentence ?? "");
    const blank = String(ex.blank ?? "").trim();
    const options = (Array.isArray(ex.options) ? ex.options.map((o) => String(o).trim()) : []).filter(Boolean);
    if (!sentence.includes("___")) return (warns.push(`${where} fill_blank: thiếu "___"`), null);
    if (!blank || !options.includes(blank) || options.length < 2)
      return (warns.push(`${where} fill_blank: blank/options không hợp lệ`), null);
    return {
      type: "fill_blank",
      sentence,
      blank,
      options,
      ...(ex.hint ? { hint: String(ex.hint) } : {}),
      ...(ex.explanation ? { explanation: String(ex.explanation) } : {}),
    };
  }
  if (ex.type === "sentence_order") {
    const words = (Array.isArray(ex.words) ? ex.words.map((w) => String(w).trim()) : []).filter(Boolean);
    const answer = stripPunct(String(ex.answer ?? "")); // UI so khớp tuyệt đối → bỏ dấu câu
    const joined = stripPunct(words.join(""));
    if (words.length < 2 || !answer) return (warns.push(`${where} sentence_order: thiếu words/answer`), null);
    if (joined.length !== answer.length || sortChars(joined) !== sortChars(answer))
      return (warns.push(`${where} sentence_order: mảnh ("${words.join("")}") không ghép thành answer ("${answer}")`), null);
    return {
      type: "sentence_order",
      words,
      answer,
      ...(ex.meaning ? { meaning: String(ex.meaning) } : {}),
      ...(ex.hint ? { hint: String(ex.hint) } : {}),
      ...(ex.explanation ? { explanation: String(ex.explanation) } : {}),
    };
  }
  if (ex.type === "translate") {
    const prompt = String(ex.prompt ?? "").trim();
    const answer = String(ex.answer ?? "").trim();
    const options = (Array.isArray(ex.options) ? ex.options.map((o) => String(o).trim()) : []).filter(Boolean);
    if (!prompt || !answer || !options.includes(answer) || options.length < 2)
      return (warns.push(`${where} translate: prompt/answer/options không hợp lệ`), null);
    return {
      type: "translate",
      direction: String(ex.direction ?? "vi_to_zh"),
      prompt,
      answer,
      options,
      ...(ex.explanation ? { explanation: String(ex.explanation) } : {}),
    };
  }
  warns.push(`${where}: loại bài tập lạ "${ex.type}"`);
  return null;
}

/** Chuẩn hoá 1 section → bảo đảm examples có pinyin (tự sinh nếu thiếu) + sạch trường. */
function cleanSection(s: RawSection, where: string, warns: string[]): RawSection {
  assert(s.id && s.title, `${where}: thiếu id/title`);
  assert(s.explanation && s.explanation.trim(), `${where}: thiếu explanation`);
  assert(Array.isArray(s.examples) && s.examples.length > 0, `${where}: thiếu examples`);
  assert(Array.isArray(s.exercises) && s.exercises.length > 0, `${where}: thiếu exercises`);

  const examples = s.examples.map((e, i) => {
    assert(e.hanzi && e.hanzi.trim(), `${where} ví dụ ${i + 1}: thiếu hanzi`);
    assert(e.meaning && e.meaning.trim(), `${where} ví dụ ${i + 1}: thiếu meaning`);
    return {
      ...(e.situation ? { situation: e.situation.trim() } : {}),
      hanzi: e.hanzi.trim(),
      pinyin: e.pinyin && e.pinyin.trim() ? e.pinyin.trim() : toPinyin(e.hanzi.trim()),
      meaning: e.meaning.trim(),
      ...(e.note ? { note: e.note.trim() } : {}),
    };
  });

  const exercises = s.exercises
    .map((ex, i) => sanitizeExercise(ex, `${where} bài tập ${i + 1}`, warns))
    .filter((e): e is RawExercise => e !== null);
  if (exercises.length === 0) warns.push(`${where}: KHÔNG còn bài tập hợp lệ (chỉ còn lý thuyết)`);

  return {
    id: s.id,
    title: s.title.trim(),
    ...(s.titleZh ? { titleZh: s.titleZh.trim() } : {}),
    ...(s.structure ? { structure: s.structure.trim() } : {}),
    ...(Array.isArray(s.breakdown) && s.breakdown.length ? { breakdown: s.breakdown } : {}),
    explanation: s.explanation.trim(),
    ...(s.usage ? { usage: s.usage.trim() } : {}),
    ...(Array.isArray(s.mistakes) && s.mistakes.length ? { mistakes: s.mistakes } : {}),
    examples,
    exercises,
  };
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "grammar-roadmap-HSK2.json");
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const byBai = new Map<number, RawSection[]>();
  for (const l of parsed.lessons) byBai.set(l.bai, l.sections);

  // ── Kiểm tra dữ liệu trước khi ghi ──
  let totalSections = 0;
  let totalExercises = 0;
  for (const m of LESSON_META) {
    const sections = byBai.get(m.bai);
    assert(sections && sections.length > 0, `Thiếu ngữ pháp cho Bài ${m.bai}`);
    for (const s of sections) {
      totalSections++;
      totalExercises += s.exercises.length;
    }
  }
  // làm sạch + xác thực sâu (bài tập không tự giải được sẽ bị loại + cảnh báo, KHÔNG abort)
  const warns: string[] = [];
  const cleanByBai = new Map<number, RawSection[]>();
  for (const m of LESSON_META) {
    const sections = byBai.get(m.bai)!;
    cleanByBai.set(
      m.bai,
      sections.map((s, i) => cleanSection(s, `Bài ${m.bai} điểm ${i + 1}`, warns))
    );
  }
  const keptExercises = [...cleanByBai.values()].reduce(
    (n, secs) => n + secs.reduce((k, s) => k + s.exercises.length, 0),
    0
  );
  console.log(`[check] ${LESSON_META.length} bài, ${totalSections} điểm ngữ pháp, ${keptExercises}/${totalExercises} bài tập hợp lệ.`);
  if (warns.length) {
    console.warn(`[warn] Loại ${warns.length} bài tập không tự giải được:`);
    for (const w of warns) console.warn(`   - ${w}`);
  }

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK2" } });
  assert(course, "Không tìm thấy Course HSK2.");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  // ── 12 chương (idempotent, chỉ đặt title — an toàn) ──
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
      update: {}, // giữ nguyên metadata bài đã tồn tại (vd do loader từ vựng đặt)
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

  // ── 35 phần GRAMMAR (order=2, đã xuất bản) ──
  let sectionsDone = 0;
  for (const m of LESSON_META) {
    const lessonId = `rl-hsk2-${m.bai}`;
    const sections = cleanByBai.get(m.bai)!;
    const content = {
      version: 3,
      sections,
      test: { questions: [], passThreshold: PASS_THRESHOLD },
    } as unknown as Prisma.InputJsonValue;

    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId, skill: "GRAMMAR" } },
      update: { content, order: 2, published: true, title: "" },
      create: { lessonId, skill: "GRAMMAR", order: 2, content, published: true },
    });
    sectionsDone++;
  }
  console.log(`[done] ${sectionsDone} phần GRAMMAR (đã xuất bản).`);

  // ── Tự kiểm tra lại từ DB ──
  const check = await prisma.roadmapLesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
    include: { sections: { where: { skill: "GRAMMAR" } } },
  });
  const withGrammar = check.filter((l) => l.sections.length > 0);
  const secSum = withGrammar.reduce((n, l) => {
    const c = l.sections[0].content as unknown as { sections?: unknown[] };
    return n + (Array.isArray(c?.sections) ? c.sections.length : 0);
  }, 0);
  console.log(
    `[verify] HSK2 bài=${check.length}, có GRAMMAR=${withGrammar.length}, tổng điểm NP=${secSum}, publish=${withGrammar.every((l) => l.sections[0].published)}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
