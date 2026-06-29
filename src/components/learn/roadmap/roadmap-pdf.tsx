import * as React from "react";
import { PdfDocument, PdfSection, PdfNotice, PdfCard, PdfNumChip, PdfAnswer, PdfAnswerLine } from "@/components/learn/pdf/pdf-document";
import { PdfPassage, type PassageScope } from "@/components/learn/reading/reading-pdf";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";
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

interface ReorderSentence {
  words: string[];
  answer: string;
  translation?: string;
}

/** PDF luyện viết lộ trình kiểu "连词成句": mỗi câu có thẻ từ cho sẵn + câu đúng & bản dịch. */
export function RoadmapWritingReorderPdf({
  title,
  titleZh,
  hskLevel,
  sentences,
}: {
  title: string;
  titleZh?: string | null;
  hskLevel: string;
  sentences: ReorderSentence[];
}) {
  return (
    <PdfDocument kicker="Viết · 连词成句" title={title || "Luyện viết"} titleZh={titleZh} subtitle="Sắp xếp từ thành câu" hskLevel={hskLevel}>
      <PdfNotice>
        ✍️ Sắp xếp các từ cho sẵn thành câu đúng (dạng đề <b>VIẾT HSK2</b>) — phần đáp án &amp; bản dịch ở ngay dưới mỗi câu.
      </PdfNotice>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sentences.map((s, i) => (
          <PdfCard key={i}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
              <PdfNumChip n={i + 1} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {s.words.map((w, j) => (
                    <span
                      key={j}
                      style={{
                        fontFamily: PDF_FONT.chinese,
                        fontSize: 14,
                        fontWeight: 600,
                        color: PDF.ink,
                        border: `1px solid ${PDF.line}`,
                        background: "#fff",
                        borderRadius: 7,
                        padding: "3px 9px",
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <PdfAnswer>
                  <PdfAnswerLine>{s.answer}</PdfAnswerLine>
                  {s.translation && (
                    <div style={{ marginTop: 3, fontSize: 12.5, color: PDF.muted }}>{s.translation}</div>
                  )}
                </PdfAnswer>
              </div>
            </div>
          </PdfCard>
        ))}
      </div>
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
