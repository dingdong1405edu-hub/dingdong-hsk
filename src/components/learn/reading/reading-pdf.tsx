import * as React from "react";
import { PdfDocument, PdfSection } from "@/components/learn/pdf/pdf-document";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";

/** Phạm vi in cho Đọc/Nghe: cả 2 · chỉ đoạn văn(lời thoại) · chỉ câu hỏi & đáp án. */
export type PassageScope = "both" | "passage" | "questions";

interface Props {
  title: string;
  titleZh?: string | null;
  hskLevel: string;
  passage: string;
  passagePinyin?: string | null;
  questions: PdfQuestion[];
  scope?: PassageScope;
}

/** Khối đoạn văn (nền nhạt, gạch nhấn bên trái). */
export function PdfPassage({ passage, pinyin }: { passage: string; pinyin?: string | null }) {
  return (
    <div
      style={{
        borderRadius: 10,
        border: `1px solid ${PDF.line}`,
        borderLeft: `3px solid ${PDF.brand}`,
        background: PDF.paperTint,
        padding: "12px 14px",
      }}
    >
      <p style={{ whiteSpace: "pre-line", fontFamily: PDF_FONT.chinese, fontSize: 15, lineHeight: 1.9, color: PDF.ink }}>
        {passage}
      </p>
      {pinyin && (
        <p style={{ whiteSpace: "pre-line", fontFamily: PDF_FONT.pinyin, fontSize: 12, lineHeight: 1.7, color: PDF.brand, marginTop: 6 }}>
          {pinyin}
        </p>
      )}
    </div>
  );
}

/** PDF đọc hiểu: đoạn văn (kèm pinyin nếu có) + câu hỏi & đáp án. */
export function ReadingPdf({ title, titleZh, hskLevel, passage, passagePinyin, questions, scope = "both" }: Props) {
  return (
    <PdfDocument kicker="Đọc hiểu · 阅读" title={title} titleZh={titleZh} hskLevel={hskLevel}>
      {scope !== "questions" && (
        <PdfSection title="Đoạn văn" titleZh="短文">
          <PdfPassage passage={passage} pinyin={passagePinyin} />
        </PdfSection>
      )}
      {scope !== "passage" && (
        <PdfSection title="Câu hỏi & đáp án" titleZh="问题与答案">
          <PdfQuestionList questions={questions} />
        </PdfSection>
      )}
    </PdfDocument>
  );
}
