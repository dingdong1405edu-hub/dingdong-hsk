import { createElement } from "react";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListeningPdf } from "@/components/learn/listening/listening-pdf";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";
import type { PdfQuestion } from "@/components/learn/pdf/pdf-question-list";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ testId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { testId } = await params;

  const test = await db.listeningTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test || !test.published) return pdfNotFound();

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

  try {
    return await renderPdfResponse(
      createElement(ListeningPdf, {
        title: test.title,
        hskLevel: test.hskLevel,
        transcript: test.transcript,
        questions,
      }),
      `DingDong HSK - Nghe hieu - ${test.title}`,
    );
  } catch (err) {
    return pdfError(err);
  }
}
