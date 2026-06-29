import { createElement, type ComponentProps, type ReactElement } from "react";
import { ReadingPdf, type PassageScope } from "@/components/learn/reading/reading-pdf";
import { ListeningPdf } from "@/components/learn/listening/listening-pdf";
import { WritingPdf } from "@/components/learn/writing/writing-pdf";
import { SpeakingPdf } from "@/components/learn/speaking/speaking-pdf";
import { VocabPdf } from "@/components/learn/vocab/vocab-pdf";
import { HanziPdf } from "@/components/learn/hanzi/hanzi-pdf";
import { LessonPdf, type GrammarPdfScope } from "@/components/learn/grammar/lesson-pdf";
import { RoadmapReadingPdf, RoadmapListeningPdf, RoadmapWritingReorderPdf } from "@/components/learn/roadmap/roadmap-pdf";

/* Tải dữ liệu MỘT lần (src/server/pdf-payload.ts) → payload tuần tự hoá được, dùng
 * chung cho trang xem trước (client) và route /api/pdf/* (server PDF). `scope` được
 * tiêm lúc render, không nằm trong payload. */

export type PdfPayload =
  | { kind: "reading"; props: Omit<ComponentProps<typeof ReadingPdf>, "scope"> }
  | { kind: "listening"; props: Omit<ComponentProps<typeof ListeningPdf>, "scope"> }
  | { kind: "writing"; props: ComponentProps<typeof WritingPdf> }
  | { kind: "speaking"; props: ComponentProps<typeof SpeakingPdf> }
  | { kind: "vocab"; props: ComponentProps<typeof VocabPdf> }
  | { kind: "hanzi"; props: ComponentProps<typeof HanziPdf> }
  | { kind: "grammar"; props: Omit<ComponentProps<typeof LessonPdf>, "scope"> }
  | { kind: "roadmap-reading"; props: Omit<ComponentProps<typeof RoadmapReadingPdf>, "scope"> }
  | { kind: "roadmap-listening"; props: Omit<ComponentProps<typeof RoadmapListeningPdf>, "scope"> }
  | { kind: "roadmap-writing-reorder"; props: ComponentProps<typeof RoadmapWritingReorderPdf> };

export type PdfKind = PdfPayload["kind"];

export interface PdfScopeOption {
  key: string;
  label: string;
}

const PASSAGE_SCOPES = (passageLabel: string): PdfScopeOption[] => [
  { key: "both", label: "Cả 2" },
  { key: "passage", label: passageLabel },
  { key: "questions", label: "Câu hỏi & đáp án" },
];

/** Các tuỳ chọn "chọn nội dung in" theo loại bài (không có = không hiện tab chọn). */
export const PDF_SCOPES: Partial<Record<PdfKind, PdfScopeOption[]>> = {
  reading: PASSAGE_SCOPES("Đoạn văn"),
  "roadmap-reading": PASSAGE_SCOPES("Đoạn văn"),
  listening: PASSAGE_SCOPES("Lời thoại"),
  "roadmap-listening": PASSAGE_SCOPES("Lời thoại"),
  grammar: [
    { key: "both", label: "Cả 2" },
    { key: "theory", label: "Lý thuyết" },
    { key: "exercises", label: "Bài tập" },
  ],
};

/** Chuẩn hoá scope theo loại bài (mặc định tuỳ chọn đầu tiên, thường "both"). */
export function normalizeScope(kind: PdfKind, scope?: string | null): string {
  const opts = PDF_SCOPES[kind];
  if (!opts || !opts.length) return "both";
  return opts.some((o) => o.key === scope) ? (scope as string) : opts[0].key;
}

/** Dựng element React cho 1 payload + scope — dùng ở cả preview (client) lẫn PDF (server). */
export function payloadToElement(payload: PdfPayload, scope?: string | null): ReactElement {
  const s = normalizeScope(payload.kind, scope);
  switch (payload.kind) {
    case "reading":
      return createElement(ReadingPdf, { ...payload.props, scope: s as PassageScope });
    case "listening":
      return createElement(ListeningPdf, { ...payload.props, scope: s as PassageScope });
    case "roadmap-reading":
      return createElement(RoadmapReadingPdf, { ...payload.props, scope: s as PassageScope });
    case "roadmap-listening":
      return createElement(RoadmapListeningPdf, { ...payload.props, scope: s as PassageScope });
    case "roadmap-writing-reorder":
      return createElement(RoadmapWritingReorderPdf, payload.props);
    case "grammar":
      return createElement(LessonPdf, { ...payload.props, scope: s as GrammarPdfScope });
    case "writing":
      return createElement(WritingPdf, payload.props);
    case "speaking":
      return createElement(SpeakingPdf, payload.props);
    case "vocab":
      return createElement(VocabPdf, payload.props);
    case "hanzi":
      return createElement(HanziPdf, payload.props);
  }
}
