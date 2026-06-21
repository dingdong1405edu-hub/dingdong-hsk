"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HSKLevel, Prisma, SubscriptionType } from "@prisma/client";
import { getPlan } from "@/lib/payment-plans";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

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
  imageUrl: z.string().optional(),
});

export async function createReadingAction(fd: FormData) {
  await requireAdmin();
  const data = readingSchema.parse(Object.fromEntries(fd));
  await db.readingTest.create({ data });
  revalidatePath("/admin/reading");
  return { ok: true };
}

export async function deleteReadingAction(id: string) {
  await requireAdmin();
  await db.readingTest.delete({ where: { id } });
  revalidatePath("/admin/reading");
  return { ok: true };
}

// ===== Listening =====
export async function createListeningAction(fd: FormData) {
  await requireAdmin();
  await db.listeningTest.create({
    data: {
      title: fd.get("title") as string,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      audioUrl: fd.get("audioUrl") as string,
      transcript: (fd.get("transcript") as string) || undefined,
      timeLimit: parseInt(fd.get("timeLimit") as string) || 300,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
    },
  });
  revalidatePath("/admin/listening");
  return { ok: true };
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

  await db.question.create({
    data: {
      type,
      prompt: fd.get("prompt") as string,
      options: options ?? Prisma.JsonNull,
      correctAnswer,
      explanation: (fd.get("explanation") as string) || undefined,
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

// Create (no lessonId) or update (lessonId present) a lesson. Returns a result
// object so the client form can show validation errors inline via useActionState.
export async function saveLessonAction(
  _prev: { ok: boolean; error?: string },
  fd: FormData
): Promise<{ ok: boolean; error?: string }> {
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

    if (skill === "vocab") {
      if (lessonId) {
        await db.vocabLesson.update({ where: { id: lessonId }, data: { title, exercises } });
      } else {
        const count = await db.vocabLesson.count({ where: { unitId } });
        await db.vocabLesson.create({ data: { unitId, title, order: count + 1, exercises } });
      }
      revalidatePath(`/admin/vocab/${unitId}`);
    } else {
      if (lessonId) {
        await db.grammarLesson.update({ where: { id: lessonId }, data: { title, exercises } });
      } else {
        const count = await db.grammarLesson.count({ where: { unitId } });
        await db.grammarLesson.create({ data: { unitId, title, order: count + 1, exercises } });
      }
      revalidatePath(`/admin/grammar/${unitId}`);
    }
    return { ok: true };
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
