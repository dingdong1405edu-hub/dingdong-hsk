import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { GrammarFlow } from "@/components/learn/grammar/grammar-flow";
import { parseGrammarContent } from "@/lib/grammar";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

export default async function GrammarLessonPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = await db.grammarLesson.findUnique({
    where: { id: lessonId },
    include: { unit: { select: { published: true } } },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) notFound(); // ẩn bài/unit nháp

  // `exercises` may be the structured theory→flashcards→test object or a legacy
  // bare drill array — the deserialiser normalises both.
  const content = parseGrammarContent(lesson.exercises);

  return (
    <GrammarFlow
      lesson={{ id: lesson.id, title: lesson.title }}
      content={content}
      unitId={unitId}
    />
  );
}
