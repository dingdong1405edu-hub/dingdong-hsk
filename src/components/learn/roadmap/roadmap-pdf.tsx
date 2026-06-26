"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import { roadmapQuestionId, type RoadmapQuestion } from "@/lib/roadmap-content";

/** Chuyển câu hỏi lộ trình (Đọc/Nghe) → PdfQuestion cho bảng đáp án in. Dùng chung
 *  cho route PDF Đọc & Nghe của lộ trình. */
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
  backHref,
}: {
  title: string;
  titleZh?: string;
  hskLevel: string;
  passages: PassageData[];
  backHref: string;
}) {
  const multi = passages.length > 1;
  return (
    <PrintableDoc title={title || "Bài đọc hiểu"} titleZh={titleZh} hskLevel={hskLevel} backHref={backHref}>
      {passages.map((p, i) => (
        <section key={i} className="mb-8 space-y-2">
          <h2 className="text-base font-bold text-violet-700">{multi ? `Đoạn ${i + 1}` : "Đoạn văn"}</h2>
          <p className="whitespace-pre-line font-chinese text-[15px] leading-loose text-zinc-900">{p.passage}</p>
          {p.passagePinyin && (
            <p className="whitespace-pre-line font-serif text-xs leading-relaxed text-violet-600">{p.passagePinyin}</p>
          )}
          <div className="pt-2">
            <h3 className="mb-2 text-sm font-bold text-violet-700">Câu hỏi &amp; đáp án</h3>
            <PdfQuestionList questions={p.questions} />
          </div>
        </section>
      ))}
    </PrintableDoc>
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
  backHref,
}: {
  title: string;
  hskLevel: string;
  clips: ClipData[];
  backHref: string;
}) {
  const multi = clips.length > 1;
  return (
    <PrintableDoc title={title || "Bài nghe hiểu"} hskLevel={hskLevel} backHref={backHref}>
      <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
        🎧 Nghe phần âm thanh trực tiếp tại dingdonghsk.com (bản PDF chỉ có lời thoại &amp; đáp án).
      </p>
      {clips.map((c, i) => (
        <section key={i} className="mb-8 space-y-2">
          <h2 className="text-base font-bold text-violet-700">
            {multi ? `Đoạn nghe ${i + 1}${c.title ? ` · ${c.title}` : ""}` : "Lời thoại (transcript)"}
          </h2>
          {c.transcript && (
            <p className="whitespace-pre-line font-chinese text-[15px] leading-loose text-zinc-900">{c.transcript}</p>
          )}
          <div className="pt-2">
            <h3 className="mb-2 text-sm font-bold text-violet-700">Câu hỏi &amp; đáp án</h3>
            <PdfQuestionList questions={c.questions} />
          </div>
        </section>
      ))}
    </PrintableDoc>
  );
}
