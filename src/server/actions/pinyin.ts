"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Skill, Prisma } from "@prisma/client";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getPinyinLesson } from "@/lib/pinyin-lessons";

const schema = z.object({
  lessonId: z.string().min(1),
  correct: z.number().int().min(0),
  total: z.number().int().min(1),
  durationSec: z.number().int().min(0).optional(),
});

/**
 * Ghi kết quả một lượt học PHIÊN ÂM. Quy tắc:
 *  - XP chỉ được trao MỘT LẦN cho mỗi bài (lần hoàn thành đầu tiên) — làm lại để ôn
 *    không cộng dồn XP, nhưng vẫn cập nhật điểm cao nhất (bestScore) và số lượt.
 *  - KHÔNG dùng tim: đây là nội dung miễn phí cho người mới bắt đầu.
 */
export async function completePinyinLessonAction(params: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Cần đăng nhập" };

  const parsed = schema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };

  const { lessonId, correct, total, durationSec } = parsed.data;
  // Chỉ chấp nhận id bài học có thật (nội dung tĩnh trong code).
  if (!getPinyinLesson(lessonId)) return { ok: false, error: "Bài học không tồn tại" };

  const userId = session.user.id;
  const safeCorrect = Math.min(correct, total);
  const score = Math.round((safeCorrect / total) * 100);
  const xpEarned = Math.round((safeCorrect / total) * 15);

  try {
    const existing = await db.pinyinProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { completed: true, bestScore: true },
    });

    // XP chỉ trao lần đầu hoàn thành.
    const firstClear = !existing?.completed;
    const xpAwarded = firstClear ? xpEarned : 0;
    const bestScore = Math.max(existing?.bestScore ?? 0, score);

    const ops: Prisma.PrismaPromise<unknown>[] = [
      db.pinyinProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        update: {
          completed: true,
          bestScore,
          attempts: { increment: 1 },
          ...(firstClear ? { xpEarned: xpAwarded } : {}),
        },
        create: { userId, lessonId, completed: true, bestScore, xpEarned: xpAwarded, attempts: 1 },
      }),
      db.attempt.create({
        data: {
          userId,
          skill: Skill.PINYIN,
          refId: lessonId,
          rawAnswer: { correct, total },
          score,
          durationSec,
        },
      }),
    ];
    if (xpAwarded > 0) {
      ops.push(
        db.user.update({
          where: { id: userId },
          data: { xp: { increment: xpAwarded }, lastActiveAt: new Date() },
        }),
      );
    }
    await db.$transaction(ops);

    revalidatePath("/hanzi/pinyin");
    revalidatePath("/dashboard");
    return { ok: true, xpEarned: xpAwarded, score, firstClear };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}
