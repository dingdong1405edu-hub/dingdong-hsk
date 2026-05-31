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
