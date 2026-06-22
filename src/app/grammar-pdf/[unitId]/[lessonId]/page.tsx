import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { LessonPdf } from "@/components/learn/grammar/lesson-pdf";
import { parseGrammarContent } from "@/lib/grammar";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

/**
 * Printable lesson handout — deliberately OUTSIDE the (learn) dashboard shell so
 * the document is the only content in normal flow and paginates cleanly when the
 * browser saves it as a PDF (no sidebar/topbar to hide, no animated ancestor to
 * mis-position an absolutely-positioned print box).
 */
export default async function GrammarLessonPdfPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = await db.grammarLesson.findUnique({
    where: { id: lessonId },
    include: { unit: true },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) notFound(); // ẩn bài/unit nháp

  const content = parseGrammarContent(lesson.exercises);

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <LessonPdf
        lessonTitle={lesson.title || "Bài ngữ pháp"}
        unitTitle={lesson.unit.title}
        unitTitleZh={lesson.unit.titleZh}
        hskLevel={lesson.unit.hskLevel}
        content={content}
        backHref={`/grammar/${unitId}`}
      />
    </div>
  );
}
