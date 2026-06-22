import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { GrammarReview, type ReviewProgressItem } from "@/components/learn/grammar/grammar-review";
import { grammarReviewExercises } from "@/lib/grammar";
import type { Exercise } from "@/types";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function GrammarUnitReviewPage({ params }: Props) {
  const { unitId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unit = await db.grammarUnit.findUnique({
    where: { id: unitId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { progress: { where: { userId: session.user.id } } },
      },
    },
  });
  if (!unit) notFound();

  // Mix every lesson's practice items into one review deck.
  const exercises: Exercise[] = unit.lessons.flatMap((l) => grammarReviewExercises(l.exercises));

  // Per-lesson completion (done = 100%, else 0%) + the unit aggregate.
  const items: ReviewProgressItem[] = unit.lessons.map((l, i) => ({
    label: l.title || `Bài ${i + 1}`,
    pct: l.progress.length > 0 && l.progress[0].completed ? 100 : 0,
  }));
  const doneCount = items.filter((it) => it.pct >= 100).length;
  const unitPct = unit.lessons.length > 0 ? Math.round((doneCount / unit.lessons.length) * 100) : 0;

  return (
    <GrammarReview
      title={unit.title}
      exercises={exercises}
      closeHref="/grammar/review"
      overall={{ label: `Tiến độ unit · ${unit.title}`, pct: unitPct }}
      itemsTitle="Tiến độ từng bài"
      items={items}
    />
  );
}
