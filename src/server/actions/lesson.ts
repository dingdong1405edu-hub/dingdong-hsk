"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Skill } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  lessonId: z.string().min(1),
  skill: z.enum(["vocab", "grammar"]),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  heartsLost: z.number().int().min(0).max(100),
  durationSec: z.number().int().min(0).optional(),
  // Whether this attempt should mark the lesson completed (unlocking the next
  // one). Defaults to true. Grammar passes `false` when the comprehensive test
  // is below its pass threshold so a failed test never unlocks progression.
  completed: z.boolean().optional(),
});

export async function completeLessonAction(params: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = schema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { lessonId, skill, correct, total, heartsLost, durationSec } = parsed.data;
  const completedFlag = parsed.data.completed ?? true;
  // correct can never exceed total; guard divides and clamp XP/score.
  const safeCorrect = Math.min(correct, total);
  const xpEarned = Math.round((safeCorrect / total) * 20);
  const score = Math.round((safeCorrect / total) * 100);
  // Only a completed (passing) attempt grants XP. A failed grammar test still
  // records the Attempt for history but awards 0 — so fail-then-retry can never
  // stack XP above a single first-time pass. Vocab always passes → unchanged.
  const xpAwarded = completedFlag ? xpEarned : 0;

  try {
    // Clamp hearts at 0 — heartsLost is client-supplied and could exceed the
    // user's current hearts; a relative `decrement` would persist a negative.
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hearts: true },
    });
    if (!user) return { ok: false, error: "User not found" };
    const newHearts = Math.max(0, user.hearts - heartsLost);
    if (skill === "vocab") {
      await db.$transaction([
        db.vocabProgress.upsert({
          where: { userId_lessonId: { userId: session.user.id, lessonId } },
          update: { completed: true, xpEarned: xpAwarded },
          create: { userId: session.user.id, lessonId, completed: true, xpEarned: xpAwarded },
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
            xp: { increment: xpAwarded },
            hearts: { set: newHearts },
            lastActiveAt: new Date(),
          },
        }),
      ]);
    } else {
      await db.$transaction([
        db.grammarProgress.upsert({
          where: { userId_lessonId: { userId: session.user.id, lessonId } },
          // A failed attempt changes nothing: it must never downgrade a prior
          // `completed: true` nor overwrite the XP already recorded for a pass.
          update: completedFlag ? { completed: true, xpEarned: xpAwarded } : {},
          create: { userId: session.user.id, lessonId, completed: completedFlag, xpEarned: xpAwarded },
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
            xp: { increment: xpAwarded },
            hearts: { set: newHearts },
            lastActiveAt: new Date(),
          },
        }),
      ]);
    }
    return { ok: true, xpEarned: xpAwarded, score };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
