import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { ListeningPdf } from "@/components/learn/listening/listening-pdf";
import type { PdfQuestion } from "@/components/learn/pdf/pdf-question-list";

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function ListeningPdfPage({ params }: Props) {
  const { testId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const test = await db.listeningTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test || !test.published) notFound();

  const questions: PdfQuestion[] = test.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    promptPinyin: q.promptPinyin,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    supportingQuote: q.supportingQuote,
  }));

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <ListeningPdf
        title={test.title}
        hskLevel={test.hskLevel}
        transcript={test.transcript}
        questions={questions}
        backHref="/listening"
      />
    </div>
  );
}
