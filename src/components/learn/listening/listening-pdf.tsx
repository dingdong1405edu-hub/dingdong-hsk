import * as React from "react";
import { PdfDocument, PdfSection, PdfNotice } from "@/components/learn/pdf/pdf-document";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";

interface Props {
  title: string;
  hskLevel: string;
  transcript?: string | null;
  questions: PdfQuestion[];
}

/** PDF nghe hiểu: ghi chú nghe online + lời thoại (transcript) + câu hỏi & đáp án. */
export function ListeningPdf({ title, hskLevel, transcript, questions }: Props) {
  return (
    <PdfDocument kicker="Nghe hiểu · 听力" title={title} hskLevel={hskLevel}>
      <PdfNotice>
        🎧 Nghe phần âm thanh trực tiếp tại <b>dingdonghsk.com</b> — bản PDF chỉ gồm lời thoại &amp; đáp án.
      </PdfNotice>
      {transcript && (
        <PdfSection title="Lời thoại" titleZh="听力原文">
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
              {transcript}
            </p>
          </div>
        </PdfSection>
      )}
      <PdfSection title="Câu hỏi & đáp án" titleZh="问题与答案">
        <PdfQuestionList questions={questions} />
      </PdfSection>
    </PdfDocument>
  );
}
