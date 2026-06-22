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
  // one). Defaults to true.
  completed: z.boolean().optional(),
  // Whether this attempt grants XP. Defaults to true. Grammar PRACTICE passes
  // `false`: học xong luyện tập chỉ mở khoá bài kế, KHÔNG cho XP — XP chỉ đến từ
  // bài kiểm tra ≥80% (submitGrammarTestAction).
  awardXp: z.boolean().optional(),
});

export async function completeLessonAction(params: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = schema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { lessonId, skill, correct, total, heartsLost, durationSec } = parsed.data;
  const completedFlag = parsed.data.completed ?? true;
  const awardXpFlag = parsed.data.awardXp ?? true;
  // correct can never exceed total; guard divides and clamp XP/score.
  const safeCorrect = Math.min(correct, total);
  const xpEarned = Math.round((safeCorrect / total) * 20);
  const score = Math.round((safeCorrect / total) * 100);
  // Only a completed attempt that opts into XP grants it.
  const xpAwarded = completedFlag && awardXpFlag ? xpEarned : 0;

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
          // Reset vị trí học dở về 0: bài đã xong nên lần vào sau là "Học lại" từ
          // đầu, không phải "Học tiếp" giữa chừng.
          update: { completed: true, xpEarned: xpAwarded, lastWordIndex: 0, lastStep: 0 },
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
          // Practice (awardXp=false) chỉ đánh dấu hoàn thành (mở khoá bài kế),
          // KHÔNG ghi đè xpEarned đã có từ lần đỗ bài kiểm tra.
          update: completedFlag ? (awardXpFlag ? { completed: true, xpEarned: xpAwarded } : { completed: true }) : {},
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

// ── Bài kiểm tra ngữ pháp (tách riêng khỏi luồng học) ─────────────────────────

const GRAMMAR_TEST_PASS = 80; // % tối thiểu để được XP

const grammarTestSchema = z.object({
  lessonId: z.string().min(1),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  durationSec: z.number().int().min(0).optional(),
});

/**
 * Chấm một lượt làm BÀI KIỂM TRA ngữ pháp. Quy tắc:
 *  - Đạt ≥ 80% mới được XP, và chỉ được XP MỘT LẦN cho mỗi bài (lần đỗ đầu tiên)
 *    — làm lại đỗ tiếp không cộng dồn.
 *  - KHÔNG ảnh hưởng việc mở khoá bài tiếp theo (việc đó do hoàn thành luyện tập
 *    quyết định). Đỗ test chỉ đánh dấu completed, không bao giờ hạ cấp.
 */
export async function submitGrammarTestAction(params: z.infer<typeof grammarTestSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = grammarTestSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { lessonId, correct, total, durationSec } = parsed.data;
  const userId = session.user.id;
  const safeCorrect = Math.min(correct, total);
  const pct = Math.round((safeCorrect / total) * 100);
  const passed = pct >= GRAMMAR_TEST_PASS;
  const xp = Math.round((safeCorrect / total) * 20);

  try {
    const existing = await db.grammarProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { xpEarned: true },
    });
    const alreadyAwarded = (existing?.xpEarned ?? 0) > 0;
    const awardNow = passed && !alreadyAwarded;
    const xpAwarded = awardNow ? xp : 0;

    const ops: Prisma.PrismaPromise<unknown>[] = [
      db.grammarProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        // Bài kiểm tra CHỈ ghi điểm kinh nghiệm — KHÔNG đụng tới `completed` (việc
        // mở khoá bài kế do hoàn thành luyện tập quyết định). Vì vậy đỗ test khi
        // chưa học cũng không tự mở khoá; và không bao giờ hạ cấp completed.
        update: awardNow ? { xpEarned: xpAwarded } : {},
        create: { userId, lessonId, completed: false, xpEarned: xpAwarded },
      }),
      db.attempt.create({
        data: {
          userId,
          skill: Skill.GRAMMAR,
          refId: lessonId,
          rawAnswer: { correct, total, kind: "test" },
          score: pct,
          durationSec,
        },
      }),
    ];
    if (xpAwarded > 0) {
      ops.push(
        db.user.update({ where: { id: userId }, data: { xp: { increment: xpAwarded }, lastActiveAt: new Date() } }),
      );
    }
    await db.$transaction(ops);

    return { ok: true, passed, pct, xpEarned: xpAwarded, alreadyAwarded };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
