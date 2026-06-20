import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { WordFlow } from "@/components/learn/vocab/word-flow";
import type { VocabWordCard, WordExample } from "@/types";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

export default async function VocabLessonPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = await db.vocabLesson.findUnique({
    where: { id: lessonId },
    include: { words: { orderBy: { order: "asc" } } },
  });
  if (!lesson) notFound();

  const words: VocabWordCard[] = lesson.words.map((w) => ({
    id: w.id,
    lessonId: w.lessonId,
    order: w.order,
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    meaning: w.meaning,
    examples: Array.isArray(w.examples) ? (w.examples as unknown as WordExample[]) : [],
    audioUrl: w.audioUrl,
  }));

  return <WordFlow lesson={{ id: lesson.id, title: lesson.title }} words={words} unitId={unitId} />;
}
