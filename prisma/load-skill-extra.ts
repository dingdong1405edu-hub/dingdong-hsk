/**
 * Nạp THÊM nội dung "Luyện kỹ năng" (Đọc/Nghe/Viết/Nói) do workflow sinh + thẩm
 * định. Đọc kết quả thô của 3 workflow (đường dẫn qua env), CHUẨN HOÁ về đúng shape
 * seed-data, GHI ra các file prisma/seed-data/*-extra.json (để db:seed đồng bộ) và
 * UPSERT thẳng vào prod (idempotent theo id ổn định, không đụng nội dung cũ).
 *
 * pinyin SINH LẠI bằng pinyin-pro (không tin AI). Câu hỏi map đúng correctAnswer
 * theo loại (MCQ index / TRUE_FALSE value / FILL_BLANK text+accepted). FILL_BLANK
 * bị loại nếu đáp án không xuất hiện nguyên văn trong đoạn/lời thoại.
 *
 * Env: R_OUT, L_OUT, WS_OUT = đường dẫn 3 file .output của workflow.
 * Chạy:  R_OUT=... L_OUT=... WS_OUT=... npx tsx prisma/load-skill-extra.ts
 *        DRY=1 ... (chỉ ghi file + kiểm tra, không đụng DB)
 */
import { PrismaClient, Prisma, QuestionType, WritingTaskType, HSKLevel } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DRY = process.env.DRY === "1";
const SEED_DIR = path.join(__dirname, "seed-data");

const sentPinyin = (s: string) => pinyin(s, { toneType: "symbol", separator: " " });
const TIME_LIMIT = { HSK1: 600, HSK2: 600, HSK3: 720, HSK4: 900, HSK5: 1080, HSK6: 1200 } as Record<string, number>;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
function readResult(envKey: string): any[] {
  const p = process.env[envKey];
  if (!p || !fs.existsSync(p)) {
    console.warn(`[warn] ${envKey} không có/không tồn tại (${p}) → bỏ qua`);
    return [];
  }
  const obj = JSON.parse(fs.readFileSync(p, "utf8"));
  let r = obj.result ?? obj;
  if (typeof r === "string") r = JSON.parse(r);
  return Array.isArray(r) ? r : r ? [r] : [];
}

// ── map 1 câu hỏi (author-shape từ workflow) → shape seed Question ──
function mapQuestion(q: any, id: string, order: number, passage: string): any | null {
  const type = String(q.type).toUpperCase();
  const prompt = String(q.prompt ?? "").trim();
  if (!prompt) return null;
  const explanation = String(q.explanation ?? "").trim() || null;
  const base = { id, type, prompt, promptPinyin: sentPinyin(prompt), explanation, order };
  if (type === "MCQ") {
    const opts = Array.isArray(q.options) ? q.options.map((o: any) => String(o).trim()).filter(Boolean) : [];
    const idx = Number(q.answerIndex);
    if (opts.length < 2 || !(idx >= 0 && idx < opts.length)) return null;
    return { ...base, options: opts.map((t: string) => ({ text: t, pinyin: sentPinyin(t) })), correctAnswer: { index: idx, text: opts[idx] } };
  }
  if (type === "TRUE_FALSE") {
    if (typeof q.answerBool !== "boolean") return null;
    return { ...base, options: null, correctAnswer: { value: q.answerBool } };
  }
  if (type === "FILL_BLANK" || type === "SHORT_ANSWER") {
    const text = String(q.answerText ?? "").trim();
    if (!text || (passage && !passage.includes(text))) return null; // đáp án phải có trong đoạn
    return { ...base, type: "FILL_BLANK", options: null, correctAnswer: { text, accepted: [text] } };
  }
  return null;
}

function buildQuestions(rawQs: any[], testId: string, passage: string): any[] {
  const out: any[] = [];
  let n = 0;
  for (const q of rawQs ?? []) {
    const mapped = mapQuestion(q, `${testId}-q${n + 1}`, n + 1, passage);
    if (mapped) {
      out.push(mapped);
      n++;
    }
  }
  return out;
}

async function main() {
  const reading = readResult("R_OUT");
  const listening = readResult("L_OUT");
  const wsRaw = readResult("WS_OUT");
  // WS_OUT trả về {writing, speaking} (object) → readResult gói thành [obj]
  const ws = wsRaw.length === 1 && (wsRaw[0].writing || wsRaw[0].speaking) ? wsRaw[0] : { writing: [], speaking: [] };
  const writing = ws.writing ?? [];
  const speaking = ws.speaking ?? [];

  // Đếm số thứ tự "x{n}" theo cấp để id ổn định, không đụng id cũ (rd-HSK1-1…).
  const seqByLevel: Record<string, number> = {};
  const nextSeq = (level: string) => (seqByLevel[level] = (seqByLevel[level] ?? 0) + 1);

  // ── READING ──
  const readingTests: any[] = [];
  for (const r of reading) {
    const level = r.level as string;
    const seq = nextSeq(`rd-${level}`);
    const id = `rd-${level}-x${seq}`;
    const passage = String(r.passage ?? "").trim();
    const qs = buildQuestions(r.questions, id, passage);
    if (!passage || qs.length < 3) continue;
    readingTests.push({
      id, title: r.title || r.topic || "Bài đọc", titleZh: r.titleZh || "", hskLevel: level,
      passage, passagePinyin: sentPinyin(passage), timeLimit: TIME_LIMIT[level] ?? 600,
      order: 50 + seq, published: true, questions: qs,
    });
  }

  // ── LISTENING ──
  const listeningTests: any[] = [];
  for (const l of listening) {
    const level = l.level as string;
    const seq = nextSeq(`ls-${level}`);
    const id = `ls-${level}-x${seq}`;
    const transcript = String(l.transcript ?? "").trim();
    const qs = buildQuestions(l.questions, id, transcript);
    if (!transcript || qs.length < 3) continue;
    listeningTests.push({
      id, title: l.title || l.topic || "Bài nghe", hskLevel: level, audioUrl: "",
      transcript, transcriptExplanation: String(l.transcriptExplanation ?? "").trim() || null,
      timeLimit: 300, order: 50 + seq, published: true, questions: qs,
    });
  }

  // ── WRITING ──
  const writingTasks: any[] = [];
  for (const w of writing) {
    const level = w.level as string;
    let k = 0;
    for (const t of w.tasks ?? []) {
      k++;
      const id = `wr-${level}-x${k}`;
      const taskType = ["FREE", "GUIDED", "PICTURE_DESCRIPTION"].includes(t.taskType) ? t.taskType : "FREE";
      const prompt = String(t.prompt ?? "").trim();
      if (!prompt) continue;
      writingTasks.push({
        id, taskType, prompt, promptZh: String(t.promptZh ?? "").trim() || null,
        outline: taskType === "GUIDED" ? String(t.outline ?? "").trim() || null : null,
        minChars: Number(t.minChars) > 0 ? Math.round(Number(t.minChars)) : 50,
        timeLimit: 900, hskLevel: level, order: 50 + k, published: true,
      });
    }
  }

  // ── SPEAKING ──
  const speakingSets: any[] = [];
  for (const s of speaking) {
    const level = s.level as string;
    const seq = (seqByLevel[`sp-${level}`] = (seqByLevel[`sp-${level}`] ?? 0) + 1);
    const id = `sp-${level}-x${seq}`;
    const part1 = (s.part1 ?? []).map((x: any) => ({ text: String(x.text ?? "").trim(), pinyin: sentPinyin(String(x.text ?? "")) })).filter((x: any) => x.text);
    const p2text = String(s.part2?.text ?? "").trim();
    const part3 = (s.part3 ?? []).map((x: any) => ({ question: String(x.question ?? "").trim(), pinyin: sentPinyin(String(x.question ?? "")) })).filter((x: any) => x.question);
    if (!part1.length && !p2text && !part3.length) continue;
    speakingSets.push({
      id, title: s.title || "Bộ đề nói", hskLevel: level, order: 50 + seq, published: true,
      part1Sentences: part1,
      part2Passage: { text: p2text, pinyin: sentPinyin(p2text) },
      part3Questions: part3,
    });
  }

  // ── Ghi file seed-data (để db:seed đồng bộ) ──
  const write = (name: string, doc: unknown) => fs.writeFileSync(path.join(SEED_DIR, name), JSON.stringify(doc, null, 2), "utf8");
  write("reading-extra.json", { kind: "reading", tests: readingTests });
  write("listening-extra.json", { kind: "listening", tests: listeningTests });
  write("writing-extra.json", { kind: "writing", tasks: writingTasks });
  write("speaking-extra.json", { kind: "speaking", sets: speakingSets });

  const rq = readingTests.reduce((n, t) => n + t.questions.length, 0);
  const lq = listeningTests.reduce((n, t) => n + t.questions.length, 0);
  console.log(`[build] Đọc=${readingTests.length} (${rq} câu) · Nghe=${listeningTests.length} (${lq} câu) · Viết=${writingTasks.length} · Nói=${speakingSets.length}`);

  if (DRY) {
    console.log("[DRY] chỉ ghi file, không đụng DB.");
    return;
  }

  // ── Upsert prod (idempotent theo id ổn định) ──
  for (const t of readingTests) {
    await prisma.readingTest.upsert({
      where: { id: t.id },
      update: { title: t.title, titleZh: t.titleZh, hskLevel: t.hskLevel as HSKLevel, passage: t.passage, passagePinyin: t.passagePinyin, timeLimit: t.timeLimit, order: t.order, published: true },
      create: { id: t.id, title: t.title, titleZh: t.titleZh, hskLevel: t.hskLevel as HSKLevel, passage: t.passage, passagePinyin: t.passagePinyin, timeLimit: t.timeLimit, order: t.order, published: true },
    });
    for (const q of t.questions) await upsertQuestion(q, { readingId: t.id });
  }
  for (const t of listeningTests) {
    await prisma.listeningTest.upsert({
      where: { id: t.id },
      update: { title: t.title, hskLevel: t.hskLevel as HSKLevel, audioUrl: "", transcript: t.transcript, transcriptExplanation: t.transcriptExplanation, timeLimit: t.timeLimit, order: t.order, published: true },
      create: { id: t.id, title: t.title, hskLevel: t.hskLevel as HSKLevel, audioUrl: "", transcript: t.transcript, transcriptExplanation: t.transcriptExplanation, timeLimit: t.timeLimit, order: t.order, published: true },
    });
    for (const q of t.questions) await upsertQuestion(q, { listeningId: t.id });
  }
  for (const t of writingTasks) {
    const data = { taskType: t.taskType as WritingTaskType, prompt: t.prompt, promptZh: t.promptZh, outline: t.outline, minChars: t.minChars, timeLimit: t.timeLimit, hskLevel: t.hskLevel as HSKLevel, order: t.order, published: true };
    await prisma.writingTask.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
  }
  for (const t of speakingSets) {
    const data = { title: t.title, hskLevel: t.hskLevel as HSKLevel, order: t.order, published: true, part1Sentences: t.part1Sentences as Prisma.InputJsonValue, part2Passage: t.part2Passage as Prisma.InputJsonValue, part3Questions: t.part3Questions as Prisma.InputJsonValue };
    await prisma.speakingSet.upsert({ where: { id: t.id }, update: data, create: { id: t.id, ...data } });
  }
  console.log(`[done] Đã ghi prod: Đọc ${readingTests.length}, Nghe ${listeningTests.length}, Viết ${writingTasks.length}, Nói ${speakingSets.length}.`);
}

async function upsertQuestion(q: any, link: { readingId?: string; listeningId?: string }) {
  const data = {
    type: q.type as QuestionType, prompt: q.prompt, promptPinyin: q.promptPinyin ?? null,
    options: (q.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
    explanation: q.explanation ?? null, order: q.order, ...link,
  };
  await prisma.question.upsert({ where: { id: String(q.id) }, update: data, create: { id: String(q.id), ...data } });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
