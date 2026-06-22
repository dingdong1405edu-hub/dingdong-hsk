import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { HSKLevel } from "@prisma/client";
import { GrammarReview, type ReviewProgressItem } from "@/components/learn/grammar/grammar-review";
import { grammarReviewExercises } from "@/lib/grammar";
import { hskLevelLabel } from "@/lib/utils";
import type { Exercise } from "@/types";

interface Props {
  params: Promise<{ level: string }>;
}

const LEVELS = new Set<string>(Object.values(HSKLevel));

export default async function GrammarLevelReviewPage({ params }: Props) {
  const { level } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!LEVELS.has(level)) notFound();

  const units = await db.grammarUnit.findMany({
    where: { hskLevel: level as HSKLevel },
    orderBy: { order: "asc" },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { progress: { where: { userId: session.user.id } } },
      },
    },
  });
  if (units.length === 0) notFound();

  // Mix every lesson of every unit in this level into one review deck.
  const exercises: Exercise[] = units.flatMap((u) =>
    u.lessons.flatMap((l) => grammarReviewExercises(l.exercises)),
  );

  // Per-unit completion + the level aggregate.
  const items: ReviewProgressItem[] = units.map((u) => {
    const total = u.lessons.length;
    const done = u.lessons.filter((l) => l.progress.length > 0 && l.progress[0].completed).length;
    return { label: u.title, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });
  const totalLessons = units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = units.reduce(
    (n, u) => n + u.lessons.filter((l) => l.progress.length > 0 && l.progress[0].completed).length,
    0,
  );
  const levelPct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  return (
    <GrammarReview
      title={`Cấp ${hskLevelLabel(level)}`}
      exercises={exercises}
      closeHref="/grammar/review"
      overall={{ label: `Tiến độ cấp ${hskLevelLabel(level)}`, pct: levelPct }}
      itemsTitle="Tiến độ từng unit"
      items={items}
    />
  );
}
