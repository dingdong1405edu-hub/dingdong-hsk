"use server";
// Lặp lại ngắt quãng (SRS) cho từ vựng phần LỘ TRÌNH. Vì từ vựng lộ trình nằm
// trong RoadmapSection.content (JSON) — không có bản ghi VocabWord — nên lịch ôn
// được lưu ở RoadmapWordReview, khoá theo (userId, hanzi). Mỗi lượt ôn cập nhật
// lịch (src/lib/srs.ts) và lưu kèm ảnh chụp từ (pinyin/nghĩa/ví dụ/audio) để màn
// "Ôn tập tổng hợp lộ trình" dựng được thẻ mà không phải quét lại mọi section.
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { schedule, dueAtFromMinutes, SRS_DEFAULT } from "@/lib/srs";

const exampleSchema = z.object({
  hanzi: z.string().default(""),
  pinyin: z.string().default(""),
  meaning: z.string().default(""),
});

const reviewSchema = z.object({
  hanzi: z.string().min(1),
  pinyin: z.string().default(""),
  meaning: z.string().default(""),
  examples: z.array(exampleSchema).default([]),
  audioUrl: z.string().nullish(),
  quality: z.number().int().min(0).max(5),
});

/**
 * Ghi nhận một lượt ôn của một từ vựng lộ trình và cập nhật lịch SRS (SM-2).
 * `quality` 0..5 do client tính từ mức tự đánh giá flashcard hoặc đúng/sai
 * mini-game (xem src/lib/srs.ts). Trả về khoảng cách & thời điểm ôn kế tiếp.
 */
export async function reviewRoadmapWordAction(params: z.infer<typeof reviewSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Unauthorized" };

  const parsed = reviewSchema.safeParse(params);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { hanzi, pinyin, meaning, examples, audioUrl, quality } = parsed.data;
  const userId = session.user.id;
  const snapshot = examples as unknown as Prisma.InputJsonValue;

  try {
    const existing = await db.roadmapWordReview.findUnique({
      where: { userId_hanzi: { userId, hanzi } },
    });
    const prev = existing
      ? { repetitions: existing.repetitions, intervalDays: existing.intervalDays, ease: existing.ease }
      : SRS_DEFAULT;

    const next = schedule(prev, quality);
    const now = new Date();
    // dueAt chính xác theo phút: "Quên" → +1 phút (quay lại học luôn), còn lại theo ngày.
    const dueAt = dueAtFromMinutes(next.intervalMinutes, now);

    await db.roadmapWordReview.upsert({
      where: { userId_hanzi: { userId, hanzi } },
      update: {
        pinyin,
        meaning,
        examples: snapshot,
        audioUrl: audioUrl ?? null,
        repetitions: next.repetitions,
        intervalDays: next.intervalDays,
        ease: next.ease,
        lapses: { increment: next.lapsed ? 1 : 0 },
        dueAt,
        lastReviewedAt: now,
      },
      create: {
        userId,
        hanzi,
        pinyin,
        meaning,
        examples: snapshot,
        audioUrl: audioUrl ?? null,
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

    return { ok: true as const, intervalDays: next.intervalDays, dueAt: dueAt.toISOString() };
  } catch {
    return { ok: false as const, error: "DB error" };
  }
}
