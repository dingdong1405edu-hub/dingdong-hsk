import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { RoadmapGlobalReview } from "@/components/learn/roadmap/roadmap-global-review";
import { slugToLevel } from "@/lib/roadmap";
import type { VocabWordCard, WordExample, WordReviewState } from "@/types";

interface Props {
  searchParams: Promise<{ level?: string }>;
}

/**
 * Hub ôn tập tổng hợp LỘ TRÌNH: mọi từ vựng lộ trình đã đến hạn ôn (SRS) trên toàn
 * bộ các cấp, gom về một phiên. Lấy theo dueAt tăng dần (quá hạn lâu nhất trước),
 * giới hạn 1 phiên. `?level=hsk1` để quay về đúng trang map đã vào.
 */
export default async function RoadmapReviewPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const { level: levelSlug } = await searchParams;
  const backHref = levelSlug && slugToLevel(levelSlug) ? `/roadmap/${levelSlug}` : "/roadmap";

  const now = new Date();
  const due = await db.roadmapWordReview.findMany({
    where: { userId, dueAt: { lte: now } },
    orderBy: { dueAt: "asc" },
    take: 24,
  });

  const words: VocabWordCard[] = due.map((r, i) => ({
    id: `rm-${r.id}`,
    lessonId: "roadmap-review",
    order: i + 1,
    hanzi: r.hanzi,
    pinyin: r.pinyin,
    meaning: r.meaning,
    examples: Array.isArray(r.examples) ? (r.examples as unknown as WordExample[]) : [],
    audioUrl: r.audioUrl,
  }));

  const reviews: WordReviewState[] = due.map((r) => ({
    wordId: `rm-${r.id}`,
    dueAt: r.dueAt.toISOString(),
    repetitions: r.repetitions,
  }));

  return <RoadmapGlobalReview words={words} reviews={reviews} backHref={backHref} />;
}
