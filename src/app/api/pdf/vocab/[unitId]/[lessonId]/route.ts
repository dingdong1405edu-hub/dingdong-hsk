import { createElement } from "react";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VocabPdf } from "@/components/learn/vocab/vocab-pdf";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ unitId: string; lessonId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { lessonId } = await params;

  const lesson = await db.vocabLesson.findUnique({
    where: { id: lessonId },
    include: { unit: true, words: { orderBy: { order: "asc" } } },
  });
  if (!lesson || !lesson.published || !lesson.unit.published) return pdfNotFound();

  const words = lesson.words.map((w) => ({
    id: w.id,
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    meaning: w.meaning,
    examples: toExamples(w.examples),
  }));

  const title = lesson.title || "Bài từ vựng";
  try {
    return await renderPdfResponse(
      createElement(VocabPdf, {
        lessonTitle: title,
        unitTitle: lesson.unit.title,
        unitTitleZh: lesson.unit.titleZh,
        hskLevel: lesson.unit.hskLevel,
        words,
      }),
      `DingDong HSK - Tu vung - ${title}`,
    );
  } catch (err) {
    return pdfError(err);
  }
}
