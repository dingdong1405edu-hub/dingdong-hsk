import { createElement } from "react";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SpeakingPdf } from "@/components/learn/speaking/speaking-pdf";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toSentences(raw: unknown): { text: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { text: String(o.text ?? o.hanzi ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((s) => s.text);
}
function toPassage(raw: unknown): { text: string; pinyin?: string } | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const text = String(o.text ?? o.hanzi ?? "");
  return text ? { text, pinyin: o.pinyin ? String(o.pinyin) : undefined } : null;
}
function toQuestions(raw: unknown): { question: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { question: String(o.question ?? o.text ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((q) => q.question);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { setId } = await params;

  const set = await db.speakingSet.findUnique({ where: { id: setId } });
  if (!set || !set.published) return pdfNotFound();

  const title = set.title || "Bài luyện nói";
  try {
    return await renderPdfResponse(
      createElement(SpeakingPdf, {
        title,
        hskLevel: set.hskLevel,
        part1: toSentences(set.part1Sentences),
        part2: toPassage(set.part2Passage),
        part3: toQuestions(set.part3Questions),
      }),
      `DingDong HSK - Luyen noi - ${title}`,
    );
  } catch (err) {
    return pdfError(err);
  }
}
