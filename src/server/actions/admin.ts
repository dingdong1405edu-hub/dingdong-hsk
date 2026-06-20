"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HSKLevel, Prisma } from "@prisma/client";

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
];

type LessonSkill = "vocab" | "grammar";

// Validate the admin-entered exercises JSON. Throws a Vietnamese Error message
// (surfaced inline by the LessonEditor) so malformed content never reaches the DB.
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
  parsed.forEach((ex, i) => {
    if (typeof ex !== "object" || ex === null || Array.isArray(ex)) {
      throw new Error(`Phần tử #${i + 1} phải là một object { "type": ... }.`);
    }
    const t = (ex as { type?: unknown }).type;
    if (typeof t !== "string" || !KNOWN_EXERCISE_TYPES.includes(t)) {
      throw new Error(
        `Phần tử #${i + 1} có "type" không hợp lệ: ${JSON.stringify(t)}. ` +
          `Cho phép: ${KNOWN_EXERCISE_TYPES.join(", ")}.`
      );
    }
  });
  return parsed as Prisma.InputJsonValue;
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
    const exercises = parseExercises(fd.get("exercises") as string);

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
