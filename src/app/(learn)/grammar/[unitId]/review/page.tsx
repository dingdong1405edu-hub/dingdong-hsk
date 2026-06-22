import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { GrammarReview } from "@/components/learn/grammar/grammar-review";
import { grammarReviewExercises } from "@/lib/grammar";
import type { Exercise } from "@/types";

interface Props {
  params: Promise<{ unitId: string }>;
}

/** Ôn tập cả unit — trộn bài tập của mọi bài trong unit thành một phiên. */
export default async function GrammarUnitReviewPage({ params }: Props) {
  const { unitId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unit = await db.grammarUnit.findUnique({
    where: { id: unitId },
    include: { lessons: { where: { published: true }, orderBy: { order: "asc" } } },
  });
  if (!unit || !unit.published) notFound(); // ẩn unit nháp khỏi học viên

  const exercises: Exercise[] = unit.lessons.flatMap((l) => grammarReviewExercises(l.exercises));

  return (
    <GrammarReview title={`Cả unit · ${unit.title}`} exercises={exercises} closeHref={`/grammar/${unitId}`} />
  );
}
