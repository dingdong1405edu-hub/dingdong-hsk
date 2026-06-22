"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { schedule, dueAtFromMinutes, SRS_DEFAULT } from "@/lib/srs";

// ── Lưu vị trí đang học (cho nút "Học tiếp" — resume) ──────────────────────────

const positionSchema = z.object({
  lessonId: z.string().min(1),
  wordIndex: z.number().int().min(0),
  step: z.number().int().min(0).max(10),
});

/**
 * Ghi lại vị trí người học đang dừng trong một bài (từ thứ mấy, bước nào) để lần
 * sau "Học tiếp" đúng chỗ. Gọi nền (fire-and-forget) khi chuyển bước trong
 * WordFlow; lỗi không chặn trải nghiệm học.
 */
export async function saveVocabPositionAction(params: z.infer<typeof positionSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = positionSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { lessonId, wordIndex, step } = parsed.data;
  try {
    await db.vocabProgress.upsert({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
      update: { lastWordIndex: wordIndex, lastStep: step },
      create: { userId: session.user.id, lessonId, lastWordIndex: wordIndex, lastStep: step },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "DB error" };
  }
}

// ── Cập nhật lịch lặp lại ngắt quãng cho một từ (chế độ "Ôn từ") ───────────────

const reviewSchema = z.object({
  wordId: z.string().min(1),
  quality: z.number().int().min(0).max(5),
});

/**
 * Ghi nhận một lượt ôn của một từ và cập nhật lịch SRS (SM-2). `quality` 0..5 do
 * client tính từ mức tự đánh giá flashcard hoặc đúng/sai mini-game (xem
 * src/lib/srs.ts). Trả về khoảng cách & thời điểm ôn kế tiếp để hiển thị.
 */
export async function reviewWordAction(params: z.infer<typeof reviewSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = reviewSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { wordId, quality } = parsed.data;
  const userId = session.user.id;
  try {
    // Đảm bảo từ tồn tại (tránh lỗi khoá ngoại khó hiểu).
    const word = await db.vocabWord.findUnique({ where: { id: wordId }, select: { id: true } });
    if (!word) return { ok: false, error: "Word not found" };

    const existing = await db.vocabReview.findUnique({
      where: { userId_wordId: { userId, wordId } },
    });
    const prev = existing
      ? { repetitions: existing.repetitions, intervalDays: existing.intervalDays, ease: existing.ease }
      : SRS_DEFAULT;

    const next = schedule(prev, quality);
    const now = new Date();
    // dueAt chính xác theo phút: "Quên" → +1 phút (quay lại học luôn), còn lại theo ngày.
    const dueAt = dueAtFromMinutes(next.intervalMinutes, now);

    await db.vocabReview.upsert({
      where: { userId_wordId: { userId, wordId } },
      update: {
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        ease: next.ease,
        lapses: { increment: next.lapsed ? 1 : 0 },
        dueAt,
        lastReviewedAt: now,
      },
      create: {
        userId,
        wordId,
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        ease: next.ease,
        lapses: next.lapsed ? 1 : 0,
        dueAt,
        lastReviewedAt: now,
      },
    });

    // Tín hiệu hoạt động nhẹ để giữ streak/lastActive khi ôn tập.
    await db.user.update({ where: { id: userId }, data: { lastActiveAt: now } });

    return { ok: true, intervalDays: next.intervalDays, dueAt: dueAt.toISOString() };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
