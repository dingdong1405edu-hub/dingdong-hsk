import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { GlobalReview } from "@/components/learn/vocab/review/global-review";
import type { VocabWordCard, WordExample, WordReviewState } from "@/types";

/**
 * Hub ôn tập tổng hợp: mọi từ vựng đã đến hạn ôn (SRS) trên toàn module, gom về
 * một phiên. Lấy theo dueAt tăng dần (quá hạn lâu nhất trước), giới hạn 1 phiên.
 */
export default async function VocabReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const now = new Date();
  const dueReviews = await db.vocabReview.findMany({
    where: { userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: 24,
    include: { word: true },
  });

  const words: VocabWordCard[] = dueReviews.map((r) => ({
    id: r.word.id,
    lessonId: r.word.lessonId,
    order: r.word.order,
    hanzi: r.word.hanzi,
    pinyin: r.word.pinyin,
    meaning: r.word.meaning,
    examples: Array.isArray(r.word.examples) ? (r.word.examples as unknown as WordExample[]) : [],
    audioUrl: r.word.audioUrl,
  }));

  const reviews: WordReviewState[] = dueReviews.map((r) => ({
    wordId: r.wordId,
    dueAt: r.dueAt.toISOString(),
    repetitions: r.repetitions,
  }));

  return <GlobalReview words={words} reviews={reviews} />;
}
