import * as React from "react";
import { PdfDocument, PdfSection, PdfNotice } from "@/components/learn/pdf/pdf-document";
import { PdfPassage, type PassageScope } from "@/components/learn/reading/reading-pdf";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import { roadmapQuestionId, type RoadmapQuestion } from "@/lib/roadmap-content";

/** Chuyển câu hỏi lộ trình (Đọc/Nghe) → PdfQuestion cho bảng đáp án in. */
export function toPdfQuestions(questions: RoadmapQuestion[]): PdfQuestion[] {
  return questions.map((q, i) => ({
    id: roadmapQuestionId(i),
    type: q.type,
    prompt: q.prompt,
    promptPinyin: q.promptPinyin ?? null,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation ?? null,
    supportingQuote: q.supportingQuote ?? null,
  }));
}

interface PassageData {
  passage: string;
  passagePinyin?: string | null;
  titleZh?: string;
  questions: PdfQuestion[];
}

/** PDF đọc hiểu lộ trình — hỗ trợ nhiều đoạn (mỗi đoạn kèm câu hỏi & đáp án). */
export function RoadmapReadingPdf({
  title,
  titleZh,
  hskLevel,
  passages,
  scope = "both",
}: {
  title: string;
  titleZh?: string;
  hskLevel: string;
  passages: PassageData[];
  scope?: PassageScope;
}) {
  const multi = passages.length > 1;
  return (
    <PdfDocument kicker="Đọc hiểu · 阅读" title={title || "Bài đọc hiểu"} titleZh={titleZh} hskLevel={hskLevel}>
      {passages.map((p, i) => (
        <PdfSection key={i} title={multi ? `Đoạn ${i + 1}` : "Đoạn văn"} titleZh={p.titleZh || (multi ? undefined : "短文")}>
          {scope !== "questions" && <PdfPassage passage={p.passage} pinyin={p.passagePinyin} />}
          {scope !== "passage" && (
            <div style={{ marginTop: scope === "questions" ? 0 : 10 }}>
              <PdfQuestionList questions={p.questions} />
            </div>
          )}
        </PdfSection>
      ))}
    </PdfDocument>
  );
}

interface ClipData {
  title?: string;
  transcript?: string | null;
  questions: PdfQuestion[];
}

/** PDF nghe hiểu lộ trình — hỗ trợ nhiều đoạn nghe (lời thoại + câu hỏi & đáp án). */
export function RoadmapListeningPdf({
  title,
  hskLevel,
  clips,
  scope = "both",
}: {
  title: string;
  hskLevel: string;
  clips: ClipData[];
  scope?: PassageScope;
}) {
  const multi = clips.length > 1;
  return (
    <PdfDocument kicker="Nghe hiểu · 听力" title={title || "Bài nghe hiểu"} hskLevel={hskLevel}>
      <PdfNotice>
        🎧 Nghe phần âm thanh trực tiếp tại <b>dingdonghsk.com</b> — bản PDF chỉ gồm lời thoại &amp; đáp án.
      </PdfNotice>
      {clips.map((c, i) => (
        <PdfSection key={i} title={multi ? `Đoạn nghe ${i + 1}${c.title ? ` · ${c.title}` : ""}` : "Lời thoại"} titleZh={multi ? undefined : "听力原文"}>
          {scope !== "questions" && c.transcript && <PdfPassage passage={c.transcript} />}
          {scope !== "passage" && (
            <div style={{ marginTop: scope === "questions" ? 0 : 10 }}>
              <PdfQuestionList questions={c.questions} />
            </div>
          )}
        </PdfSection>
      ))}
    </PdfDocument>
  );
}
