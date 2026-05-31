"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Skill } from "@prisma/client";

export async function completeLessonAction(params: {
  lessonId: string;
  skill: "vocab" | "grammar";
  correct: number;
  total: number;
  heartsLost: number;
  durationSec: number;
}) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const { lessonId, skill, correct, total, heartsLost, durationSec } = params;
  const xpEarned = Math.round((correct / total) * 20);
  const score = Math.round((correct / total) * 100);

  try {
    if (skill === "vocab") {
      await db.$transaction([
        db.vocabProgress.upsert({
          where: { userId_lessonId: { userId: session.user.id, lessonId } },
          update: { completed: true, xpEarned },
          create: { userId: session.user.id, lessonId, completed: true, xpEarned },
        }),
        db.attempt.create({
          data: {
            userId: session.user.id,
            skill: Skill.VOCAB,
            refId: lessonId,
            rawAnswer: { correct, total },
            score,
            durationSec,
          },
        }),
        db.user.update({
          where: { id: session.user.id },
          data: {
            xp: { increment: xpEarned },
            hearts: { decrement: heartsLost },
            lastActiveAt: new Date(),
          },
        }),
      ]);
    } else {
      await db.$transaction([
        db.grammarProgress.upsert({
          where: { userId_lessonId: { userId: session.user.id, lessonId } },
          update: { completed: true, xpEarned },
          create: { userId: session.user.id, lessonId, completed: true, xpEarned },
        }),
        db.attempt.create({
          data: {
            userId: session.user.id,
            skill: Skill.GRAMMAR,
            refId: lessonId,
            rawAnswer: { correct, total },
            score,
            durationSec,
          },
        }),
        db.user.update({
          where: { id: session.user.id },
          data: {
            xp: { increment: xpEarned },
            hearts: { decrement: heartsLost },
            lastActiveAt: new Date(),
          },
        }),
      ]);
    }
    return { ok: true, xpEarned, score };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
