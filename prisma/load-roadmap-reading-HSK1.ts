/**
 * Nạp ĐỌC HIỂU HSK1 vào lộ trình (Course HSK1 → các bài 9–35, mỗi bài 1 phần
 * READING đã xuất bản, 2 đoạn/bài, 5 câu hỏi/đoạn). Theo PDF "HSK1 — ĐỌC HIỂU
 * (2 ĐOẠN/BÀI)": 35 bài × 2 đoạn. Bài 1–8 đã có sẵn phần Đọc do admin soạn (kèm
 * ảnh) nên loader này KHÔNG đụng tới — chỉ bù 27 bài còn thiếu (9–35).
 *
 * - Dữ liệu: prisma/seed-data/reading-roadmap-HSK1.json (workflow soạn câu hỏi +
 *   đối soát đáp án từ chính các đoạn văn của PDF).
 * - Bài lộ trình HSK1 dùng id cuid (KHÔNG phải rl-hsk1-N) → tra theo `order`
 *   trong Course HSK1; `order` của bài khớp số BÀI trong PDF (1↔1).
 * - passagePinyin tự sinh bằng pinyin-pro (giống cách phần Đọc 1–8 đã làm).
 * - imageUrl bỏ trống cho bài mới (admin có thể thêm ảnh sau ở trang quản trị).
 * - Idempotent: upsert RoadmapSection theo (lessonId, skill READING). KHÔNG xoá gì.
 *
 * Chạy: npx tsx prisma/load-roadmap-reading-HSK1.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

const FIRST_BAI = 9;
const LAST_BAI = 35;
const TIME_LIMIT = 600;
const READING_ORDER = 4; // VOCAB=1, GRAMMAR=2, HANZI=3, READING=4, LISTENING=5...

type RawOption = { text: string };
type RawAnswer = { index?: number; value?: boolean; text?: string; accepted?: string[] };
type RawQuestion = {
  type: string;
  prompt: string;
  options?: RawOption[];
  correctAnswer: RawAnswer;
  explanation?: string;
};
type RawPassage = { passage: string; titleZh?: string; questions: RawQuestion[] };
type RawLesson = {
  bai: number;
  topicZh?: string;
  topicVi?: string;
  error?: boolean;
  passages: RawPassage[];
};

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const warnings: string[] = [];

function buildQuestion(q: RawQuestion, where: string) {
  const type = String(q.type ?? "").toUpperCase();
  const prompt = (q.prompt ?? "").trim();
  assert(prompt, `${where}: prompt trống`);
  const explanation = (q.explanation ?? "").trim();
  assert(explanation, `${where}: thiếu giải thích`);

  if (type === "MCQ") {
    const options = (q.options ?? []).map((o) => ({ text: String(o.text ?? "").trim() }));
    assert(options.length >= 2 && options.every((o) => o.text), `${where}: MCQ thiếu options`);
    const index = q.correctAnswer?.index;
    assert(
      typeof index === "number" && index >= 0 && index < options.length,
      `${where}: MCQ index sai (${index}) với ${options.length} lựa chọn`
    );
    return { type: "MCQ", prompt, options, correctAnswer: { index }, explanation };
  }
  if (type === "TRUE_FALSE") {
    const value = q.correctAnswer?.value;
    assert(typeof value === "boolean", `${where}: TRUE_FALSE thiếu value (boolean)`);
    return { type: "TRUE_FALSE", prompt, correctAnswer: { value }, explanation };
  }
  if (type === "FILL_BLANK" || type === "SHORT_ANSWER") {
    const text = (q.correctAnswer?.text ?? "").trim();
    assert(text, `${where}: FILL_BLANK thiếu text đáp án`);
    const accepted = Array.isArray(q.correctAnswer?.accepted)
      ? q.correctAnswer!.accepted!.map((a) => String(a).trim()).filter(Boolean)
      : [];
    return { type: "FILL_BLANK", prompt, correctAnswer: { text, accepted }, explanation };
  }
  throw new Error(`${where}: type không hỗ trợ (${q.type})`);
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "reading-roadmap-HSK1.json");
  assert(fs.existsSync(dataPath), `Thiếu file dữ liệu: ${dataPath}`);
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const byBai = new Map<number, RawLesson>();
  for (const l of parsed.lessons) byBai.set(l.bai, l);

  // ── Dựng + kiểm tra content từng bài (9–35) trước khi ghi ──
  const contentByBai = new Map<number, Prisma.InputJsonValue>();
  const titleByBai = new Map<number, { title: string; titleZh: string }>();
  let passageCount = 0;
  let qCount = 0;
  for (let bai = FIRST_BAI; bai <= LAST_BAI; bai++) {
    const l = byBai.get(bai);
    assert(l, `Thiếu dữ liệu Bài ${bai}`);
    assert(!l.error, `Bài ${bai}: dữ liệu lỗi (workflow không sinh được)`);
    assert(Array.isArray(l.passages) && l.passages.length === 2, `Bài ${bai}: ${l.passages?.length} đoạn (cần 2)`);

    const builtPassages = l.passages.map((p, pi) => {
      const passage = (p.passage ?? "").trim();
      assert(passage, `Bài ${bai} đoạn ${pi + 1}: passage trống`);
      const questions = (p.questions ?? []).map((q, qi) =>
        buildQuestion(q, `Bài ${bai} đoạn ${pi + 1} câu ${qi + 1}`)
      );
      assert(questions.length >= 1, `Bài ${bai} đoạn ${pi + 1}: cần ít nhất 1 câu hỏi`);
      // Cảnh báo mềm: FILL_BLANK đáp án nên xuất hiện nguyên văn trong đoạn.
      for (const q of questions) {
        if (q.type === "FILL_BLANK") {
          const t = (q.correctAnswer as { text: string }).text;
          if (t && !passage.includes(t)) {
            warnings.push(`Bài ${bai} đoạn ${pi + 1}: FILL_BLANK "${t}" không có nguyên văn trong đoạn`);
          }
        }
      }
      qCount += questions.length;
      passageCount++;
      return {
        passage,
        passagePinyin: toPinyin(passage),
        titleZh: (p.titleZh ?? l.topicZh ?? "").trim(),
        questions,
      };
    });

    titleByBai.set(bai, { title: (l.topicVi ?? "").trim(), titleZh: (l.topicZh ?? "").trim() });
    contentByBai.set(bai, {
      title: (l.topicVi ?? "").trim(),
      titleZh: (l.topicZh ?? "").trim(),
      timeLimit: TIME_LIMIT,
      passages: builtPassages,
    } as unknown as Prisma.InputJsonValue);
  }
  console.log(`[check] OK — ${LAST_BAI - FIRST_BAI + 1} bài, ${passageCount} đoạn, ${qCount} câu hỏi.`);
  if (warnings.length) {
    console.log(`[warn] ${warnings.length} cảnh báo:`);
    for (const w of warnings) console.log(`  - ${w}`);
  }

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK1" } });
  assert(course, "Không tìm thấy Course HSK1.");
  console.log(`[course] ${course.id} — ${course.title} (${course.titleZh})`);

  // Bài HSK1 dùng id cuid → tra theo order trong course.
  const lessons = await prisma.roadmapLesson.findMany({
    where: { courseId: course.id },
    select: { id: true, order: true, topicZh: true, sections: { where: { skill: "READING" }, select: { id: true } } },
  });
  const lessonByOrder = new Map<number, (typeof lessons)[number]>();
  for (const l of lessons) lessonByOrder.set(l.order, l);

  // ── Upsert phần READING cho bài 9–35 ──
  let done = 0;
  for (let bai = FIRST_BAI; bai <= LAST_BAI; bai++) {
    const lesson = lessonByOrder.get(bai);
    assert(lesson, `Không thấy bài order=${bai} trong Course HSK1.`);
    // Sanity: tên 中文 của bài phải khớp dữ liệu (tránh nạp nhầm thứ tự).
    const expectZh = titleByBai.get(bai)!.titleZh;
    if (expectZh && lesson.topicZh && lesson.topicZh.trim() !== expectZh) {
      warnings.push(`Bài order=${bai}: topicZh DB "${lesson.topicZh}" ≠ dữ liệu "${expectZh}" (vẫn nạp)`);
    }
    const content = contentByBai.get(bai)!;
    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId: lesson.id, skill: "READING" } },
      update: { content, order: READING_ORDER, published: true, title: "" },
      create: { lessonId: lesson.id, skill: "READING", order: READING_ORDER, content, published: true },
    });
    done++;
  }
  console.log(`[done] ${done} phần READING (đã xuất bản) cho bài ${FIRST_BAI}–${LAST_BAI}.`);

  // ── Tự kiểm tra lại từ DB ──
  const secs = await prisma.roadmapSection.findMany({
    where: { skill: "READING", lesson: { courseId: course.id } },
    select: { content: true, published: true, lesson: { select: { order: true } } },
  });
  const passages = secs.reduce((n, s) => n + (((s.content as any)?.passages?.length) || 0), 0);
  const qs = secs.reduce((n, s) => {
    const ps = (s.content as any)?.passages || [];
    return n + ps.reduce((m: number, p: any) => m + (p.questions?.length || 0), 0);
  }, 0);
  const orders = secs.map((s) => s.lesson.order).sort((a, b) => a - b);
  console.log(
    `[verify] HSK1 READING sections=${secs.length} (orders ${orders[0]}–${orders[orders.length - 1]}), ` +
      `passages=${passages}, questions=${qs}, publish=${secs.every((s) => s.published)}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
