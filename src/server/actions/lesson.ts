"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Skill, Prisma } from "@prisma/client";
import { z } from "zod";
import { getEntitlements } from "@/lib/entitlements";
import { effectiveHearts, MAX_HEARTS } from "@/lib/hearts";

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
    const ent = await getEntitlements(
      session.user.id,
      (session.user as { role?: string }).role
    );
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { hearts: true, heartsUpdatedAt: true },
    });
    if (!user) return { ok: false, error: "User not found" };

    // Tim: người trả phí / admin = KHÔNG GIỚI HẠN → không đụng tới. Người miễn
    // phí: hồi tim theo thời gian trước, trừ số tim đã mất; hoàn thành không sai
    // câu nào (heartsLost === 0) thì TẶNG +1 tim để khuyến khích học.
    const heartData: Prisma.UserUpdateInput = {};
    if (!ent.unlimitedHearts) {
      const now = new Date();
      const current = effectiveHearts(user.hearts, user.heartsUpdatedAt, now);
      let next = Math.max(0, current - heartsLost);
      if (completedFlag && heartsLost === 0) next = Math.min(MAX_HEARTS, next + 1);
      heartData.hearts = { set: next };
      heartData.heartsUpdatedAt = now;
    }

    const userUpdate: Prisma.UserUpdateInput = {
      xp: { increment: xpAwarded },
      lastActiveAt: new Date(),
      ...heartData,
    };
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
        db.user.update({ where: { id: session.user.id }, data: userUpdate }),
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
        db.user.update({ where: { id: session.user.id }, data: userUpdate }),
      ]);
    }
    return { ok: true, xpEarned: xpAwarded, score };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
