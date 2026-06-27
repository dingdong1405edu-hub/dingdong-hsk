import { createElement } from "react";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { LessonPdf, type GrammarPdfScope } from "@/components/learn/grammar/lesson-pdf";
import { parseGrammarContent } from "@/lib/grammar";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCOPES: GrammarPdfScope[] = ["both", "theory", "exercises"];

export async function GET(req: NextRequest, { params }: { params: Promise<{ unitId: string; lessonId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { lessonId } = await params;

  const raw = req.nextUrl.searchParams.get("scope");
  const scope: GrammarPdfScope = SCOPES.includes(raw as GrammarPdfScope) ? (raw as GrammarPdfScope) : "both";

  const lesson = await db.grammarLesson.findUnique({ where: { id: lessonId }, include: { unit: true } });
  if (!lesson || !lesson.published || !lesson.unit.published) return pdfNotFound();

  const content = parseGrammarContent(lesson.exercises);
  const title = lesson.title || "Bài ngữ pháp";

  try {
    return await renderPdfResponse(
      createElement(LessonPdf, {
        lessonTitle: title,
        unitTitle: lesson.unit.title,
        unitTitleZh: lesson.unit.titleZh,
        hskLevel: lesson.unit.hskLevel,
        content,
        scope,
      }),
      `DingDong HSK - Ngu phap - ${title}`,
    );
  } catch (err) {
    return pdfError(err);
  }
}
