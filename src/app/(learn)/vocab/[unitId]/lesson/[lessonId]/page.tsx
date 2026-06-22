import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { LessonHub } from "@/components/learn/vocab/lesson-hub";
import type { VocabWordCard, WordExample, WordReviewState } from "@/types";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

export default async function VocabLessonPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const lesson = await db.vocabLesson.findUnique({
    where: { id: lessonId },
    include: { words: { orderBy: { order: "asc" } }, unit: { select: { published: true } } },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) notFound(); // ẩn bài/unit nháp

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

  // Tiến độ học (cho Học tiếp/Học lại) + lịch SRS từng từ + bài kế tiếp, song song.
  const [progress, reviewRows, nextLesson] = await Promise.all([
    db.vocabProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { completed: true, lastWordIndex: true, lastStep: true },
    }),
    db.vocabReview.findMany({
      where: { userId, wordId: { in: words.map((w) => w.id) } },
      select: { wordId: true, dueAt: true, repetitions: true },
    }),
    db.vocabLesson.findFirst({
      where: { unitId: lesson.unitId, order: { gt: lesson.order } },
      orderBy: { order: "asc" },
      select: { id: true },
    }),
  ]);

  const completed = progress?.completed ?? false;
  const resume =
    !completed && progress && (progress.lastWordIndex > 0 || progress.lastStep > 0)
      ? { wordIndex: progress.lastWordIndex, step: progress.lastStep }
      : null;

  const reviews: WordReviewState[] = reviewRows.map((r) => ({
    wordId: r.wordId,
    dueAt: r.dueAt.toISOString(),
    repetitions: r.repetitions,
  }));

  return (
    <LessonHub
      lesson={{ id: lesson.id, title: lesson.title }}
      unitId={unitId}
      words={words}
      reviews={reviews}
      resume={resume}
      completed={completed}
      nextLessonId={nextLesson?.id ?? null}
    />
  );
}
