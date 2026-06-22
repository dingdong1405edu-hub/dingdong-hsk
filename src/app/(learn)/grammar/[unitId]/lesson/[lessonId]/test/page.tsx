import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { GrammarTestFlow } from "@/components/learn/grammar/grammar-test-flow";
import { parseGrammarContent } from "@/lib/grammar";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

/** Bài kiểm tra ngữ pháp — tách riêng khỏi luồng học (chỉ đây mới có XP, ≥80%). */
export default async function GrammarLessonTestPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = await db.grammarLesson.findUnique({
    where: { id: lessonId },
    include: { unit: { select: { published: true } } },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) notFound();

  const content = parseGrammarContent(lesson.exercises);

  return <GrammarTestFlow lesson={{ id: lesson.id, title: lesson.title }} content={content} unitId={unitId} />;
}
