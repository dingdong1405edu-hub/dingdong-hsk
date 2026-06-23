"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HSKLevel, Prisma, QuestionType, Role, SubscriptionType, WritingTaskType } from "@prisma/client";
import { getPlan } from "@/lib/payment-plans";
import { requireAdmin } from "@/lib/admin-guard";
import { parseGrammarContent } from "@/lib/grammar";
import { generateReadingQuestions, isGradingConfigured } from "@/lib/groq";

export async function adminUpdateUserAction(params: {
  userId: string;
  action: "ban" | "unban" | "resetHearts";
  hskLevel?: string;
}) {
  await requireAdmin();
  const { userId, action } = params;

  if (action === "ban") {
    await db.user.update({ where: { id: userId }, data: { banned: true } });
  } else if (action === "unban") {
    await db.user.update({ where: { id: userId }, data: { banned: false } });
  } else if (action === "resetHearts") {
    await db.user.update({ where: { id: userId }, data: { hearts: 5 } });
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

// ===== Cấp quyền lợi (Subscription) thủ công =====
// Dùng để kích hoạt gói cho 1 tài khoản trước khi PayOS hoạt động (hoặc khi cần
// tặng/đối soát). Cấp đúng các quyền (grants) của gói với thời hạn của gói.
const grantSubSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  planId: z.string().min(1),
});

export async function adminGrantSubscriptionAction(input: {
  email: string;
  planId: string;
}): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = grantSubSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const plan = getPlan(parsed.data.planId);
  if (!plan || plan.grants.length === 0) return { ok: false, error: "Gói không tồn tại." };

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (!user) return { ok: false, error: "Không tìm thấy người dùng với email này." };

  const start = new Date();
  const expiresAt = new Date(start.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await db.$transaction(
    plan.grants.map((g) =>
      db.subscription.create({
        data: {
          userId: user.id,
          type: g.type as SubscriptionType,
          hskLevel: g.hskLevel ? (g.hskLevel as HSKLevel) : null,
          startedAt: start,
          expiresAt,
        },
      })
    )
  );

  revalidatePath("/admin/subscriptions");
  return { ok: true };
}

// ===== Reading =====
const readingSchema = z.object({
  title: z.string().min(1),
  titleZh: z.string().min(1),
  hskLevel: z.nativeEnum(HSKLevel),
  passage: z.string().min(1),
  passagePinyin: z.string().optional(),
  timeLimit: z.coerce.number().min(60),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^(https?:\/\/|\/)\S+$/.test(v), "Liên kết ảnh không hợp lệ."),
});

export async function createReadingAction(fd: FormData) {
  await requireAdmin();
  const data = readingSchema.parse(Object.fromEntries(fd));
  await db.readingTest.create({
    data: {
      ...data,
      // Empty hidden-input / pasted blanks normalise to null (not "") so
      // "has image?" checks stay consistent with updateReadingAction.
      imageUrl: data.imageUrl?.trim() ? data.imageUrl : null,
      passagePinyin: data.passagePinyin?.trim() ? data.passagePinyin : null,
      published: false, // bản nháp: admin xuất bản sau khi kiểm lại
    },
  });
  revalidatePath("/admin/reading");
  return { ok: true };
}

const updateReadingSchema = readingSchema.extend({ id: z.string().min(1) });

export async function updateReadingAction(fd: FormData) {
  await requireAdmin();
  const { id, ...rest } = updateReadingSchema.parse(Object.fromEntries(fd));
  await db.readingTest.update({
    where: { id },
    data: {
      title: rest.title,
      titleZh: rest.titleZh,
      hskLevel: rest.hskLevel,
      passage: rest.passage,
      // KHÔNG ghi passagePinyin: form sửa đã bỏ ô pinyin nên field không được gửi lên.
      // Cố ghi sẽ luôn nhận undefined → xoá mất pinyin cũ (vẫn dùng cho xuất PDF). Giữ nguyên giá trị DB.
      timeLimit: rest.timeLimit,
      imageUrl: rest.imageUrl?.trim() ? rest.imageUrl : null,
    },
  });
  revalidatePath(`/admin/reading/${id}`);
  revalidatePath("/admin/reading");
  return { ok: true };
}

export async function deleteReadingAction(id: string) {
  await requireAdmin();
  await db.readingTest.delete({ where: { id } });
  revalidatePath("/admin/reading");
  return { ok: true };
}

// ===== Reading: thêm câu hỏi hàng loạt bằng JSON + AI sinh câu hỏi =====
// Một ô JSON duy nhất cho cả 2 luồng: admin dán tay HOẶC bấm "AI tạo câu hỏi"
// để Groq đổ JSON vào ô rồi admin duyệt trước khi lưu. Định dạng (mảng):
//   { "type":"MCQ", "prompt":"…", "options":["…"], "answer":<0-based>, "explanation"?, "supportingQuote"? }
//   { "type":"TRUE_FALSE", "prompt":"…", "answer":<bool>, … }
//   { "type":"FILL_BLANK", "prompt":"…", "answer":"…", "accepted"?:["…"], … }
const bulkQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("MCQ"),
    prompt: z.string().trim().min(1),
    options: z.array(z.string().trim().min(1)).min(2, "MCQ cần ≥ 2 lựa chọn."),
    answer: z.coerce.number().int().min(0),
    explanation: z.string().trim().optional(),
    supportingQuote: z.string().trim().optional(),
  }),
  z.object({
    type: z.literal("TRUE_FALSE"),
    prompt: z.string().trim().min(1),
    answer: z.boolean(),
    explanation: z.string().trim().optional(),
    supportingQuote: z.string().trim().optional(),
  }),
  z.object({
    type: z.literal("FILL_BLANK"),
    prompt: z.string().trim().min(1),
    answer: z.string().trim().min(1),
    accepted: z.array(z.string().trim().min(1)).optional(),
    explanation: z.string().trim().optional(),
    supportingQuote: z.string().trim().optional(),
  }),
]);
const bulkQuestionsSchema = z.array(bulkQuestionSchema).min(1, "Cần ít nhất 1 câu hỏi.").max(50, "Tối đa 50 câu mỗi lần.");

export async function bulkCreateReadingQuestionsAction(readingId: string, jsonText: string) {
  await requireAdmin();
  if (!readingId) return { ok: false as const, error: "Thiếu mã bài đọc." };

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    return { ok: false as const, error: "JSON không hợp lệ — kiểm tra lại dấu ngoặc/dấu phẩy." };
  }

  const result = bulkQuestionsSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.length ? `(ở ${first.path.join(".")}) ` : "";
    return { ok: false as const, error: `JSON sai cấu trúc ${where}— ${first?.message ?? "không xác định"}` };
  }
  const questions = result.data;

  // Chỉ số đáp án MCQ phải nằm trong số lựa chọn.
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.type === "MCQ" && q.answer >= q.options.length) {
      return { ok: false as const, error: `Câu ${i + 1} (MCQ): "answer" (${q.answer}) vượt quá số lựa chọn (${q.options.length}).` };
    }
  }

  const reading = await db.readingTest.findUnique({ where: { id: readingId }, select: { id: true } });
  if (!reading) return { ok: false as const, error: "Không tìm thấy bài đọc." };

  const startOrder = (await db.question.count({ where: { readingId } })) + 1;

  try {
    await db.$transaction(
      questions.map((q, i) => {
        const base = {
          prompt: q.prompt,
          explanation: q.explanation,
          supportingQuote: q.supportingQuote,
          readingId,
          order: startOrder + i,
        };
        if (q.type === "MCQ") {
          return db.question.create({
            data: { ...base, type: QuestionType.MCQ, options: q.options.map((t) => ({ text: t })), correctAnswer: { index: q.answer } },
          });
        }
        if (q.type === "TRUE_FALSE") {
          return db.question.create({
            data: { ...base, type: QuestionType.TRUE_FALSE, options: Prisma.JsonNull, correctAnswer: { value: q.answer } },
          });
        }
        return db.question.create({
          data: { ...base, type: QuestionType.FILL_BLANK, options: Prisma.JsonNull, correctAnswer: { text: q.answer, accepted: q.accepted ?? [] } },
        });
      }),
    );
  } catch (e) {
    console.error("bulkCreateReadingQuestions error:", e);
    return { ok: false as const, error: "Lỗi lưu câu hỏi vào cơ sở dữ liệu." };
  }

  revalidatePath(`/admin/reading/${readingId}`);
  return { ok: true as const, count: questions.length };
}

export async function generateReadingQuestionsAction(readingId: string, count: number) {
  await requireAdmin();
  if (!isGradingConfigured()) {
    return { ok: false as const, error: "Máy chủ chưa cấu hình GROQ_API_KEY." };
  }
  const reading = await db.readingTest.findUnique({
    where: { id: readingId },
    select: { passage: true, hskLevel: true },
  });
  if (!reading) return { ok: false as const, error: "Không tìm thấy bài đọc." };
  if (!reading.passage.trim()) return { ok: false as const, error: "Bài đọc chưa có đoạn văn để AI tạo câu hỏi." };

  try {
    const questions = await generateReadingQuestions({
      passage: reading.passage,
      hskLevel: reading.hskLevel,
      count,
    });
    if (questions.length === 0) return { ok: false as const, error: "AI chưa tạo được câu hỏi nào — thử lại." };
    return { ok: true as const, json: JSON.stringify(questions, null, 2) };
  } catch (e) {
    console.error("generateReadingQuestions error:", e);
    return { ok: false as const, error: "Lỗi khi gọi AI (Groq). Thử lại sau." };
  }
}

// ===== Listening =====
// Both audio and transcript are intentionally OPTIONAL (an admin may save a
// shell, then add audio/questions on the detail page). The learner player
// degrades gracefully when both are missing. We still validate title/level/time
// and normalize empties so a malformed POST returns { ok:false } instead of an
// opaque Prisma crash.
const listeningSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tiêu đề bài nghe."),
  hskLevel: z.nativeEnum(HSKLevel),
  audioUrl: z.string().trim().optional(),
  transcript: z.string().optional(),
  timeLimit: z.coerce.number().int().min(30).default(300),
  imageUrl: z.string().trim().optional(),
});

function listeningData(input: z.infer<typeof listeningSchema>) {
  return {
    title: input.title,
    hskLevel: input.hskLevel,
    audioUrl: input.audioUrl?.trim() ? input.audioUrl.trim() : "",
    transcript: input.transcript?.trim() ? input.transcript : null,
    timeLimit: input.timeLimit,
    imageUrl: input.imageUrl?.trim() ? input.imageUrl : null,
  };
}

export async function createListeningAction(
  fd: FormData,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  try {
    const data = listeningData(listeningSchema.parse(Object.fromEntries(fd)));
    const created = await db.listeningTest.create({ data: { ...data, published: false } }); // bản nháp
    revalidatePath("/admin/listening");
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo bài nghe." };
  }
}

export async function updateListeningAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id bài nghe." };
    const data = listeningData(listeningSchema.parse(Object.fromEntries(fd)));
    await db.listeningTest.update({ where: { id }, data });
    revalidatePath(`/admin/listening/${id}`);
    revalidatePath("/admin/listening");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật bài nghe." };
  }
}

export async function deleteListeningAction(id: string) {
  await requireAdmin();
  await db.listeningTest.delete({ where: { id } });
  revalidatePath("/admin/listening");
  return { ok: true };
}

// ===== Writing =====
export async function createWritingAction(fd: FormData) {
  await requireAdmin();
  await db.writingTask.create({
    data: {
      taskType: fd.get("taskType") as "FREE" | "GUIDED" | "PICTURE_DESCRIPTION",
      prompt: fd.get("prompt") as string,
      promptZh: (fd.get("promptZh") as string) || undefined,
      minChars: parseInt(fd.get("minChars") as string) || 50,
      timeLimit: parseInt(fd.get("timeLimit") as string) || 900,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      published: false, // bản nháp: admin xuất bản sau khi kiểm lại
    },
  });
  revalidatePath("/admin/writing");
  return { ok: true };
}

export async function deleteWritingAction(id: string) {
  await requireAdmin();
  await db.writingTask.delete({ where: { id } });
  revalidatePath("/admin/writing");
  return { ok: true };
}

// ===== Speaking =====
export async function deleteSpeakingAction(id: string) {
  await requireAdmin();
  await db.speakingSet.delete({ where: { id } });
  revalidatePath("/admin/speaking");
  return { ok: true };
}

// ===== Questions =====
export async function createQuestionAction(fd: FormData) {
  await requireAdmin();
  const type = fd.get("type") as "MCQ" | "TRUE_FALSE" | "FILL_BLANK";
  const readingId = (fd.get("readingId") as string) || undefined;
  const listeningId = (fd.get("listeningId") as string) || undefined;

  let options: Prisma.InputJsonValue | undefined = undefined;
  let correctAnswer: Prisma.InputJsonValue = {};

  if (type === "MCQ") {
    const opts = (fd.get("options") as string).split("\n").filter(Boolean).map((t) => ({ text: t.trim() }));
    options = opts as Prisma.InputJsonValue;
    correctAnswer = { index: parseInt(fd.get("correctIndex") as string) };
  } else if (type === "TRUE_FALSE") {
    correctAnswer = { value: fd.get("correctBool") === "true" };
  }

  // Thêm vào CUỐI danh sách để thứ tự ổn định (trang admin/học viên sắp xếp theo
  // `order` asc). Không set order thì mọi câu hỏi đều = 0 → thứ tự nhảy lung tung.
  const count = await db.question.count({
    where: readingId ? { readingId } : { listeningId },
  });

  await db.question.create({
    data: {
      type,
      prompt: fd.get("prompt") as string,
      options: options ?? Prisma.JsonNull,
      correctAnswer,
      explanation: (fd.get("explanation") as string) || undefined,
      order: count + 1,
      readingId,
      listeningId,
    },
  });

  if (readingId) revalidatePath(`/admin/reading/${readingId}`);
  if (listeningId) revalidatePath(`/admin/listening/${listeningId}`);
  return { ok: true };
}

export async function deleteQuestionAction(
  questionId: string,
  ref: { readingId?: string; listeningId?: string }
) {
  await requireAdmin();
  await db.question.delete({ where: { id: questionId } });
  if (ref.readingId) revalidatePath(`/admin/reading/${ref.readingId}`);
  if (ref.listeningId) revalidatePath(`/admin/listening/${ref.listeningId}`);
  return { ok: true };
}

// ===== Vocab / Grammar lessons =====
// Lessons store their drills in `exercises` (JSON array). Vocab & Grammar share
// the exact same shape, so the admin tooling is unified by a `skill` discriminator.
const KNOWN_EXERCISE_TYPES = [
  "match",
  "translate",
  "toneSelect",
  "hanziInput",
  "sentenceOrder",
  "sentence_order",
  "pinyinMatch",
  "fill_blank",
  "answer_question",
  "type_sentence",
];

type LessonSkill = "vocab" | "grammar";

// Validate a single exercise object. Throws a Vietnamese Error so malformed
// content never reaches the DB (surfaced inline by the LessonEditor).
function validateExercise(ex: unknown, i: number, label: string): void {
  if (typeof ex !== "object" || ex === null || Array.isArray(ex)) {
    throw new Error(`${label} #${i + 1} phải là một object { "type": ... }.`);
  }
  const t = (ex as { type?: unknown }).type;
  if (typeof t !== "string" || !KNOWN_EXERCISE_TYPES.includes(t)) {
    throw new Error(
      `${label} #${i + 1} có "type" không hợp lệ: ${JSON.stringify(t)}. ` +
        `Cho phép: ${KNOWN_EXERCISE_TYPES.join(", ")}.`
    );
  }
}

// Vocab lessons: a flat, non-empty array of drills.
function parseExercises(raw: string): Prisma.InputJsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Nội dung bài tập không phải JSON hợp lệ.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Bài tập phải là một mảng JSON có ít nhất 1 phần tử.");
  }
  parsed.forEach((ex, i) => validateExercise(ex, i, "Phần tử"));
  return parsed as Prisma.InputJsonValue;
}

// Validate one section's required theory fields + that its exercise list (under
// `exField`) holds only known exercise types.
function validateSection(s: unknown, i: number, exField: string): void {
  if (typeof s !== "object" || s === null || Array.isArray(s)) {
    throw new Error(`Phần #${i + 1} phải là một object.`);
  }
  const sec = s as Record<string, unknown>;
  if (typeof sec.title !== "string" || !sec.title.trim()) {
    throw new Error(`Phần #${i + 1} thiếu "title".`);
  }
  if (typeof sec.explanation !== "string" || !sec.explanation.trim()) {
    throw new Error(`Phần #${i + 1} thiếu "explanation".`);
  }
  if (!Array.isArray(sec.examples)) {
    throw new Error(`Phần #${i + 1} phải có "examples" là một mảng (để [] nếu không có ví dụ).`);
  }
  const exs = sec[exField];
  if (exs !== undefined && !Array.isArray(exs)) {
    throw new Error(`"${exField}" của phần #${i + 1} phải là một mảng.`);
  }
  (Array.isArray(exs) ? exs : []).forEach((ex, j) =>
    validateExercise(ex, j, `Bài tập của phần #${i + 1}`)
  );
}

// Grammar lessons: the v3 object { sections:[{ ...theory, exercises }], test }.
// Also accepts a legacy bare Exercise[] array and the older v2 object
// { theory, flashcards, test } so previously-saved content still edits & saves.
function parseGrammarLessonInput(raw: string): Prisma.InputJsonValue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Nội dung bài học không phải JSON hợp lệ.");
  }

  // Legacy bare array → store as-is; the learner deserialiser wraps it.
  if (Array.isArray(parsed)) {
    parsed.forEach((ex, i) => validateExercise(ex, i, "Bài tập"));
    return parsed as Prisma.InputJsonValue;
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(
      'Nội dung phải là object { "sections": [...], "test": {...} } hoặc một mảng bài tập.'
    );
  }

  const obj = parsed as Record<string, unknown>;
  const testObj = obj.test ?? {};
  if (typeof testObj !== "object" || testObj === null || Array.isArray(testObj)) {
    throw new Error('"test" phải là một object { "questions": [...] }.');
  }
  const questions = (testObj as Record<string, unknown>).questions ?? [];
  if (!Array.isArray(questions)) throw new Error('"test.questions" phải là một mảng.');
  questions.forEach((q, i) => validateExercise(q, i, "Câu hỏi test"));

  // v3 — sections each carry their own practice exercises.
  if (Array.isArray(obj.sections)) {
    obj.sections.forEach((s, i) => validateSection(s, i, "exercises"));
    if (obj.sections.length === 0 && questions.length === 0) {
      throw new Error("Bài học phải có ít nhất một phần (section) hoặc câu hỏi test.");
    }
    return parsed as Prisma.InputJsonValue;
  }

  // v2 back-compat — { theory, flashcards, test }.
  if (Array.isArray(obj.theory) || Array.isArray(obj.flashcards)) {
    const theory = obj.theory ?? [];
    const flashcards = obj.flashcards ?? [];
    if (!Array.isArray(theory)) throw new Error('"theory" phải là một mảng.');
    if (!Array.isArray(flashcards)) throw new Error('"flashcards" phải là một mảng.');
    theory.forEach((s, i) => validateSection(s, i, "__noExercises__"));
    flashcards.forEach((ex, i) => validateExercise(ex, i, "Flashcard"));
    if (theory.length === 0 && flashcards.length === 0 && questions.length === 0) {
      throw new Error("Bài học phải có ít nhất một phần lý thuyết, flashcard hoặc câu hỏi test.");
    }
    return parsed as Prisma.InputJsonValue;
  }

  throw new Error(
    'Object không hợp lệ. Cần "sections" (khuyến nghị) hoặc "theory"/"flashcards", kèm "test".'
  );
}

// Cảnh báo MỀM (không chặn lưu): mỗi điểm ngữ pháp nên có đủ 8 minigame —
// 2× "chọn từ" (fill_blank) + 2× "sắp xếp câu" (sentence_order) + 2× dịch
// Việt→Trung (translate vi_to_zh) + 2× dịch Trung→Việt (translate zh_to_vi).
function grammarStructureWarning(value: Prisma.InputJsonValue): string | undefined {
  const content = parseGrammarContent(value as unknown);
  const problems: string[] = [];
  content.sections.forEach((s, i) => {
    const c = { fill: 0, order: 0, vi2zh: 0, zh2vi: 0 };
    for (const ex of s.exercises) {
      const e = ex as Record<string, unknown>;
      const t = String(e.type);
      if (t === "fill_blank") c.fill++;
      else if (t === "sentence_order" || t === "sentenceOrder") c.order++;
      else if (t === "translate") {
        if (e.direction === "vi_to_zh") c.vi2zh++;
        else if (e.direction === "zh_to_vi") c.zh2vi++;
      }
    }
    const missing: string[] = [];
    if (c.fill < 2) missing.push("chọn từ ×2 (fill_blank)");
    if (c.order < 2) missing.push("sắp xếp câu ×2 (sentence_order)");
    if (c.vi2zh < 2) missing.push("dịch Việt→Trung ×2 (translate vi_to_zh)");
    if (c.zh2vi < 2) missing.push("dịch Trung→Việt ×2 (translate zh_to_vi)");
    if (missing.length) problems.push(`Phần ${i + 1}${s.title ? ` (“${s.title}”)` : ""}: thiếu ${missing.join(", ")}`);
  });
  if (problems.length === 0) return undefined;
  return (
    "Đã lưu, nhưng nên chuẩn hoá: mỗi điểm ngữ pháp cần đủ 8 minigame (2× mỗi loại). " +
    problems.join("; ") +
    "."
  );
}

// Create (no lessonId) or update (lessonId present) a lesson. Returns a result
// object so the client form can show validation errors / warnings inline.
export async function saveLessonAction(
  _prev: { ok: boolean; error?: string; warning?: string },
  fd: FormData
): Promise<{ ok: boolean; error?: string; warning?: string }> {
  try {
    await requireAdmin();
    const skill = fd.get("skill") as LessonSkill;
    const unitId = fd.get("unitId") as string;
    const lessonId = (fd.get("lessonId") as string) || "";
    const title = ((fd.get("title") as string) || "").trim();
    const exercises =
      skill === "grammar"
        ? parseGrammarLessonInput(fd.get("exercises") as string)
        : parseExercises(fd.get("exercises") as string);
    const warning = skill === "grammar" ? grammarStructureWarning(exercises) : undefined;

    if (skill === "vocab") {
      if (lessonId) {
        await db.vocabLesson.update({ where: { id: lessonId }, data: { title, exercises } });
      } else {
        const count = await db.vocabLesson.count({ where: { unitId } });
        await db.vocabLesson.create({
          data: { unitId, title, order: count + 1, exercises, published: false }, // bản nháp
        });
      }
      revalidatePath(`/admin/vocab/${unitId}`);
    } else {
      if (lessonId) {
        await db.grammarLesson.update({ where: { id: lessonId }, data: { title, exercises } });
      } else {
        const count = await db.grammarLesson.count({ where: { unitId } });
        await db.grammarLesson.create({
          data: { unitId, title, order: count + 1, exercises, published: false }, // bản nháp
        });
      }
      revalidatePath(`/admin/grammar/${unitId}`);
    }
    return { ok: true, warning };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định." };
  }
}

export async function deleteLessonAction(skill: LessonSkill, lessonId: string, unitId: string) {
  await requireAdmin();
  if (skill === "vocab") {
    await db.vocabLesson.delete({ where: { id: lessonId } });
    revalidatePath(`/admin/vocab/${unitId}`);
  } else {
    await db.grammarLesson.delete({ where: { id: lessonId } });
    revalidatePath(`/admin/grammar/${unitId}`);
  }
  return { ok: true };
}

// ===== Vocab words (per-word learner flow) =====
// Each VocabWord drives the show → trace → write → flashcard flow. The admin
// word editor calls these directly with typed objects (not FormData).
const wordExampleSchema = z.object({
  hanzi: z.string().trim().min(1, "Câu ví dụ không được để trống."),
  pinyin: z.string().trim().default(""),
  meaning: z.string().trim().default(""),
});

const vocabWordSchema = z.object({
  id: z.string().optional(), // present → update, absent → create
  lessonId: z.string().min(1),
  unitId: z.string().min(1), // for revalidation only
  hanzi: z.string().trim().min(1, "Thiếu chữ Hán."),
  pinyin: z.string().trim().min(1, "Thiếu pinyin."),
  meaning: z.string().trim().min(1, "Thiếu nghĩa tiếng Việt."),
  audioUrl: z.string().trim().optional(),
  examples: z.array(wordExampleSchema).default([]),
});

export type VocabWordInput = z.input<typeof vocabWordSchema>;

export async function saveVocabWordAction(
  input: VocabWordInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const data = vocabWordSchema.parse(input);

    // Every example must contain the word's hanzi — the learner UI auto-bolds it,
    // so an example without the word would render nothing to highlight.
    for (const ex of data.examples) {
      if (!ex.hanzi.includes(data.hanzi)) {
        throw new Error(`Câu ví dụ “${ex.hanzi}” không chứa chữ “${data.hanzi}”.`);
      }
    }

    // Ownership: the target lesson must exist and belong to the given unit.
    const lesson = await db.vocabLesson.findUnique({
      where: { id: data.lessonId },
      select: { unitId: true },
    });
    if (!lesson || lesson.unitId !== data.unitId) {
      throw new Error("Bài học không hợp lệ.");
    }

    const examples = data.examples as unknown as Prisma.InputJsonValue;
    const audioUrl = data.audioUrl ? data.audioUrl : null;

    if (data.id) {
      // The word being edited must actually live in this lesson.
      const existing = await db.vocabWord.findUnique({
        where: { id: data.id },
        select: { lessonId: true },
      });
      if (!existing || existing.lessonId !== data.lessonId) {
        throw new Error("Từ không thuộc bài học này.");
      }
      await db.vocabWord.update({
        where: { id: data.id },
        data: { hanzi: data.hanzi, pinyin: data.pinyin, meaning: data.meaning, audioUrl, examples },
      });
    } else {
      const count = await db.vocabWord.count({ where: { lessonId: data.lessonId } });
      await db.vocabWord.create({
        data: {
          lessonId: data.lessonId,
          order: count + 1,
          hanzi: data.hanzi,
          pinyin: data.pinyin,
          meaning: data.meaning,
          audioUrl,
          examples,
        },
      });
    }
    revalidatePath(`/admin/vocab/${data.unitId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định." };
  }
}

export async function deleteVocabWordAction(id: string, unitId: string) {
  await requireAdmin();
  const word = await db.vocabWord.findUnique({
    where: { id },
    select: { lesson: { select: { unitId: true } } },
  });
  if (!word || word.lesson.unitId !== unitId) {
    throw new Error("Không tìm thấy từ trong unit này.");
  }
  await db.vocabWord.delete({ where: { id } });
  revalidatePath(`/admin/vocab/${unitId}`);
  return { ok: true };
}

export async function reorderVocabWordsAction(unitId: string, orderedIds: string[]) {
  await requireAdmin();
  if (orderedIds.length === 0) return { ok: true };
  // Every word must exist, share one lesson, and that lesson must be in this unit
  // — otherwise reordering could corrupt the `order` sequence across lessons.
  const words = await db.vocabWord.findMany({
    where: { id: { in: orderedIds } },
    select: { id: true, lessonId: true, lesson: { select: { unitId: true } } },
  });
  const lessonIds = new Set(words.map((w) => w.lessonId));
  if (
    words.length !== orderedIds.length ||
    lessonIds.size !== 1 ||
    words.some((w) => w.lesson.unitId !== unitId)
  ) {
    throw new Error("Danh sách sắp xếp không hợp lệ.");
  }
  await db.$transaction(
    orderedIds.map((id, i) => db.vocabWord.update({ where: { id }, data: { order: i + 1 } }))
  );
  revalidatePath(`/admin/vocab/${unitId}`);
  return { ok: true };
}

// ===== Bulk import vocab words (paste / CSV / .xlsx) =====
// Parsing/preview happens client-side; this action validates and persists the
// already-mapped rows. Each row → one VocabWord appended to the lesson.
const bulkRowSchema = z.object({
  hanzi: z.string().trim().min(1),
  pinyin: z.string().trim().default(""),
  meaning: z.string().trim().min(1),
  exHanzi: z.string().trim().default(""),
  exPinyin: z.string().trim().default(""),
  exMeaning: z.string().trim().default(""),
});

export interface VocabBulkRow {
  hanzi: string;
  pinyin?: string;
  meaning: string;
  exHanzi?: string;
  exPinyin?: string;
  exMeaning?: string;
}

export async function bulkImportVocabWordsAction(input: {
  lessonId: string;
  unitId: string;
  rows: VocabBulkRow[];
}): Promise<{ ok: boolean; created?: number; skipped?: number; error?: string }> {
  try {
    await requireAdmin();
    const lessonId = String(input?.lessonId ?? "");
    const unitId = String(input?.unitId ?? "");

    const lesson = await db.vocabLesson.findUnique({
      where: { id: lessonId },
      select: { unitId: true },
    });
    if (!lesson || lesson.unitId !== unitId) {
      throw new Error("Bài học không hợp lệ.");
    }

    const rows = Array.isArray(input?.rows) ? input.rows : [];
    const valid: Array<{
      hanzi: string;
      pinyin: string;
      meaning: string;
      examples: Prisma.InputJsonValue;
    }> = [];
    let skipped = 0;

    for (const raw of rows) {
      const parsed = bulkRowSchema.safeParse(raw);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const d = parsed.data;
      const examples: Array<{ hanzi: string; pinyin: string; meaning: string }> = [];
      // Keep the example only if it actually contains the word — the learner UI
      // bolds the word inside the example, so an example without it renders nothing.
      if (d.exHanzi && d.exHanzi.includes(d.hanzi)) {
        examples.push({ hanzi: d.exHanzi, pinyin: d.exPinyin, meaning: d.exMeaning });
      }
      valid.push({
        hanzi: d.hanzi,
        pinyin: d.pinyin,
        meaning: d.meaning,
        examples: examples as unknown as Prisma.InputJsonValue,
      });
    }

    if (valid.length === 0) {
      return { ok: false, error: "Không có dòng hợp lệ (cần ít nhất chữ Hán và nghĩa)." };
    }

    const count = await db.vocabWord.count({ where: { lessonId } });
    await db.$transaction(
      valid.map((v, i) =>
        db.vocabWord.create({
          data: {
            lessonId,
            order: count + i + 1,
            hanzi: v.hanzi,
            pinyin: v.pinyin,
            meaning: v.meaning,
            audioUrl: null,
            examples: v.examples,
          },
        })
      )
    );
    revalidatePath(`/admin/vocab/${unitId}`);
    return { ok: true, created: valid.length, skipped };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định." };
  }
}

// ===================================================================
//  XUẤT BẢN / ẨN (publish · draft) — bật/tắt hiển thị nội dung trên web học viên
// ===================================================================
// Mỗi loại nội dung có một cột `published`. false = bản nháp (chỉ admin thấy,
// ẩn khỏi mọi trang học viên). Các trang học viên lọc `where: { published: true }`,
// nên đổi cờ này là đủ để hiện/ẩn. Toggle ở admin gọi action này rồi router.refresh().
type ContentModel =
  | "vocabUnit"
  | "vocabLesson"
  | "grammarUnit"
  | "grammarLesson"
  | "hanzi"
  | "reading"
  | "listening"
  | "writing"
  | "speaking"
  | "mockExam";

// Đường dẫn cần làm mới cache sau khi đổi trạng thái: trang admin (danh sách) và
// trang học viên tương ứng. Dashboard học viên cũng đếm nội dung nên làm mới luôn.
const CONTENT_PATHS: Record<ContentModel, { admin: string; learner: string }> = {
  vocabUnit: { admin: "/admin/vocab", learner: "/vocab" },
  vocabLesson: { admin: "/admin/vocab", learner: "/vocab" },
  grammarUnit: { admin: "/admin/grammar", learner: "/grammar" },
  grammarLesson: { admin: "/admin/grammar", learner: "/grammar" },
  hanzi: { admin: "/admin/hanzi", learner: "/hanzi" },
  reading: { admin: "/admin/reading", learner: "/reading" },
  listening: { admin: "/admin/listening", learner: "/listening" },
  writing: { admin: "/admin/writing", learner: "/writing" },
  speaking: { admin: "/admin/speaking", learner: "/speaking" },
  mockExam: { admin: "/admin/exam", learner: "/exam" },
};

function revalidateContent(model: ContentModel) {
  const p = CONTENT_PATHS[model];
  revalidatePath(p.admin);
  revalidatePath(p.learner);
  revalidatePath("/dashboard");
  revalidatePath("/exam");
}

export async function setContentPublishedAction(
  model: ContentModel,
  id: string,
  published: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!id) return { ok: false, error: "Thiếu id nội dung." };
    switch (model) {
      case "vocabUnit":
        await db.vocabUnit.update({ where: { id }, data: { published } });
        break;
      case "vocabLesson":
        await db.vocabLesson.update({ where: { id }, data: { published } });
        break;
      case "grammarUnit":
        await db.grammarUnit.update({ where: { id }, data: { published } });
        break;
      case "grammarLesson":
        await db.grammarLesson.update({ where: { id }, data: { published } });
        break;
      case "hanzi":
        await db.hanziCharacter.update({ where: { id }, data: { published } });
        break;
      case "reading":
        await db.readingTest.update({ where: { id }, data: { published } });
        break;
      case "listening":
        await db.listeningTest.update({ where: { id }, data: { published } });
        break;
      case "writing":
        await db.writingTask.update({ where: { id }, data: { published } });
        break;
      case "speaking":
        await db.speakingSet.update({ where: { id }, data: { published } });
        break;
      case "mockExam":
        await db.mockExam.update({ where: { id }, data: { published } });
        break;
      default:
        return { ok: false, error: "Loại nội dung không hợp lệ." };
    }
    revalidateContent(model);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật trạng thái." };
  }
}

// ===================================================================
//  ĐỔI CHỖ (reorder) — sắp xếp lại thứ tự hiển thị
// ===================================================================
// Mọi action chuẩn hoá `order` về 1..n trên đúng phạm vi (một unit, hoặc một cấp
// HSK của một loại) sau khi đã xác thực mọi id thuộc phạm vi đó — tránh làm hỏng
// chuỗi `order` giữa các phạm vi. Học viên & admin sắp xếp theo [order, createdAt].

// Bài học trong một unit (Từ vựng / Ngữ pháp).
export async function reorderLessonsAction(
  skill: LessonSkill,
  unitId: string,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (orderedIds.length === 0) return { ok: true };
    if (skill === "vocab") {
      const lessons = await db.vocabLesson.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, unitId: true },
      });
      if (lessons.length !== orderedIds.length || lessons.some((l) => l.unitId !== unitId)) {
        return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
      }
      await db.$transaction(
        orderedIds.map((id, i) => db.vocabLesson.update({ where: { id }, data: { order: i + 1 } }))
      );
      revalidatePath(`/admin/vocab/${unitId}`);
      revalidatePath("/vocab");
    } else {
      const lessons = await db.grammarLesson.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, unitId: true },
      });
      if (lessons.length !== orderedIds.length || lessons.some((l) => l.unitId !== unitId)) {
        return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
      }
      await db.$transaction(
        orderedIds.map((id, i) => db.grammarLesson.update({ where: { id }, data: { order: i + 1 } }))
      );
      revalidatePath(`/admin/grammar/${unitId}`);
      revalidatePath("/grammar");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự bài học." };
  }
}

// Units trong một cấp HSK (Từ vựng / Ngữ pháp).
export async function reorderUnitsAction(
  skill: LessonSkill,
  hskLevel: HSKLevel,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (orderedIds.length === 0) return { ok: true };
    if (skill === "vocab") {
      const units = await db.vocabUnit.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, hskLevel: true },
      });
      if (units.length !== orderedIds.length || units.some((u) => u.hskLevel !== hskLevel)) {
        return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
      }
      await db.$transaction(
        orderedIds.map((id, i) => db.vocabUnit.update({ where: { id }, data: { order: i + 1 } }))
      );
    } else {
      const units = await db.grammarUnit.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true, hskLevel: true },
      });
      if (units.length !== orderedIds.length || units.some((u) => u.hskLevel !== hskLevel)) {
        return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
      }
      await db.$transaction(
        orderedIds.map((id, i) => db.grammarUnit.update({ where: { id }, data: { order: i + 1 } }))
      );
    }
    revalidatePath(skill === "vocab" ? "/admin/vocab" : "/admin/grammar");
    revalidatePath(skill === "vocab" ? "/vocab" : "/grammar");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự unit." };
  }
}

// Bài độc lập (Đọc / Nghe / Viết / Nói / Chữ Hán) trong một cấp HSK.
type OrderedContentModel = "reading" | "listening" | "writing" | "speaking" | "hanzi";

export async function reorderContentAction(
  model: OrderedContentModel,
  hskLevel: HSKLevel,
  orderedIds: string[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (orderedIds.length === 0) return { ok: true };

    // Xác thực: mọi id tồn tại và cùng một cấp HSK (không trộn cấp khi sắp xếp).
    const rows = await (async () => {
      switch (model) {
        case "reading":
          return db.readingTest.findMany({ where: { id: { in: orderedIds } }, select: { id: true, hskLevel: true } });
        case "listening":
          return db.listeningTest.findMany({ where: { id: { in: orderedIds } }, select: { id: true, hskLevel: true } });
        case "writing":
          return db.writingTask.findMany({ where: { id: { in: orderedIds } }, select: { id: true, hskLevel: true } });
        case "speaking":
          return db.speakingSet.findMany({ where: { id: { in: orderedIds } }, select: { id: true, hskLevel: true } });
        case "hanzi":
          return db.hanziCharacter.findMany({ where: { id: { in: orderedIds } }, select: { id: true, hskLevel: true } });
      }
    })();
    if (rows.length !== orderedIds.length || rows.some((r) => r.hskLevel !== hskLevel)) {
      return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
    }

    await db.$transaction(
      orderedIds.map((id, i) => {
        const data = { order: i + 1 };
        switch (model) {
          case "reading":
            return db.readingTest.update({ where: { id }, data });
          case "listening":
            return db.listeningTest.update({ where: { id }, data });
          case "writing":
            return db.writingTask.update({ where: { id }, data });
          case "speaking":
            return db.speakingSet.update({ where: { id }, data });
          case "hanzi":
            return db.hanziCharacter.update({ where: { id }, data });
        }
      })
    );
    revalidateContent(model);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự." };
  }
}

// ===================================================================
//  PHÂN QUYỀN ADMIN CON (sub-admin) — phong / gỡ quyền ADMIN
// ===================================================================
// Một "admin con" đơn giản là một tài khoản có Role.ADMIN (toàn quyền). Action
// này đổi role giữa ADMIN ↔ LEARNER. Vì role được cache trong JWT, requireAdmin
// và admin layout đã đọc role trực tiếp từ DB nên quyền có hiệu lực ngay.
const setRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(Role),
});

export async function adminSetUserRoleAction(input: {
  userId: string;
  role: "ADMIN" | "LEARNER";
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await requireAdmin();
    const parsed = setRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
    }
    // Không cho tự đổi quyền của chính mình — tránh tự khoá mình ra khỏi admin
    // (và đảm bảo luôn còn ít nhất một admin: chính người đang thao tác).
    if (parsed.data.userId === session.user?.id) {
      return { ok: false, error: "Không thể tự đổi quyền của chính mình." };
    }
    const target = await db.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true },
    });
    if (!target) return { ok: false, error: "Không tìm thấy người dùng." };

    await db.user.update({ where: { id: parsed.data.userId }, data: { role: parsed.data.role } });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${parsed.data.userId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi quyền." };
  }
}

// ===================================================================
//  THU HỒI GÓI (revoke subscription) — gỡ một quyền lợi đã cấp
// ===================================================================
// Xoá một Subscription (kể cả gói cấp qua PayOS lẫn cấp thủ công). Dùng khi cần
// huỷ/đối soát. Không đụng tới Payment (lịch sử giao dịch vẫn giữ nguyên).
export async function revokeSubscriptionAction(
  subscriptionId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!subscriptionId) return { ok: false, error: "Thiếu id gói." };
    const sub = await db.subscription.findUnique({
      where: { id: subscriptionId },
      select: { userId: true },
    });
    if (!sub) return { ok: false, error: "Không tìm thấy gói." };
    await db.subscription.delete({ where: { id: subscriptionId } });
    revalidatePath(`/admin/users/${sub.userId}`);
    revalidatePath("/admin/subscriptions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi thu hồi gói." };
  }
}

// ===================================================================
//  CẬP NHẬT (edit) cho các loại còn thiếu action sửa: Viết / Nói / Chữ Hán / Unit
// ===================================================================
// Các form sửa ở admin (đặt trong <details> trên trang danh sách) POST FormData
// về đây. Chuẩn hoá chuỗi rỗng → null cho ảnh, và bọc JSON.parse trong try/catch
// để dữ liệu hỏng trả { ok:false } thay vì sập Prisma.
function optStr(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string | null)?.trim();
  return v ? v : null;
}

export async function updateWritingAction(
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id bài viết." };
    await db.writingTask.update({
      where: { id },
      data: {
        taskType: fd.get("taskType") as WritingTaskType,
        prompt: (fd.get("prompt") as string) || "",
        promptZh: optStr(fd, "promptZh"),
        outline: optStr(fd, "outline"),
        minChars: parseInt(fd.get("minChars") as string) || 50,
        timeLimit: parseInt(fd.get("timeLimit") as string) || 900,
        hskLevel: fd.get("hskLevel") as HSKLevel,
        imageUrl: optStr(fd, "imageUrl"),
      },
    });
    revalidatePath("/admin/writing");
    revalidatePath("/writing");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật bài viết." };
  }
}

export async function updateSpeakingAction(
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id bộ nói." };
    const parseJson = (key: string, label: string): Prisma.InputJsonValue => {
      try {
        return JSON.parse((fd.get(key) as string) || "");
      } catch {
        throw new Error(`${label} không phải JSON hợp lệ.`);
      }
    };
    await db.speakingSet.update({
      where: { id },
      data: {
        title: (fd.get("title") as string) || "",
        hskLevel: fd.get("hskLevel") as HSKLevel,
        imageUrl: optStr(fd, "imageUrl"),
        part1Sentences: parseJson("part1Sentences", "Part 1"),
        part2Passage: parseJson("part2Passage", "Part 2"),
        part3Questions: parseJson("part3Questions", "Part 3"),
      },
    });
    revalidatePath("/admin/speaking");
    revalidatePath("/speaking");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật bộ nói." };
  }
}

export async function updateHanziAction(
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id chữ Hán." };
    await db.hanziCharacter.update({
      where: { id },
      data: {
        character: (fd.get("character") as string) || "",
        pinyin: (fd.get("pinyin") as string) || "",
        tone: parseInt(fd.get("tone") as string) || 0,
        meaning: (fd.get("meaning") as string) || "",
        hskLevel: fd.get("hskLevel") as HSKLevel,
        strokeCount: parseInt(fd.get("strokeCount") as string) || 0,
        imageUrl: optStr(fd, "imageUrl"),
      },
    });
    revalidatePath("/admin/hanzi");
    revalidatePath("/hanzi");
    return { ok: true };
  } catch (e) {
    // ký tự trùng (cột @unique) hoặc lỗi khác
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật chữ Hán." };
  }
}

// Sửa thông tin Unit (Từ vựng / Ngữ pháp): tên VI/ZH, cấp HSK, ảnh.
export async function updateUnitAction(
  skill: LessonSkill,
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id unit." };
    const data = {
      title: (fd.get("title") as string) || "",
      titleZh: (fd.get("titleZh") as string) || "",
      hskLevel: fd.get("hskLevel") as HSKLevel,
      imageUrl: optStr(fd, "imageUrl"),
    };
    if (skill === "vocab") {
      await db.vocabUnit.update({ where: { id }, data });
      revalidatePath("/admin/vocab");
      revalidatePath(`/admin/vocab/${id}`);
      revalidatePath("/vocab");
    } else {
      await db.grammarUnit.update({ where: { id }, data });
      revalidatePath("/admin/grammar");
      revalidatePath(`/admin/grammar/${id}`);
      revalidatePath("/grammar");
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật unit." };
  }
}
