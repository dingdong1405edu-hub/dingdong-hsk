import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { VocabPdf } from "@/components/learn/vocab/vocab-pdf";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

function toExamples(raw: unknown): { hanzi: string; pinyin: string; meaning: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return {
      hanzi: String(o.hanzi ?? ""),
      pinyin: String(o.pinyin ?? ""),
      meaning: String(o.meaning ?? ""),
    };
  });
}

export default async function VocabLessonPdfPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = await db.vocabLesson.findUnique({
    where: { id: lessonId },
    include: { unit: true, words: { orderBy: { order: "asc" } } },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) notFound();

  const words = lesson.words.map((w) => ({
    id: w.id,
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    meaning: w.meaning,
    examples: toExamples(w.examples),
  }));

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <VocabPdf
        lessonTitle={lesson.title || "Bài từ vựng"}
        unitTitle={lesson.unit.title}
        unitTitleZh={lesson.unit.titleZh}
        hskLevel={lesson.unit.hskLevel}
        words={words}
        backHref={`/vocab/${unitId}`}
      />
    </div>
  );
}
