"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";

interface Props {
  title: string;
  hskLevel: string;
  transcript?: string | null;
  questions: PdfQuestion[];
  backHref: string;
}

/** PDF nghe hiểu: ghi chú nghe online + lời thoại (transcript) + câu hỏi & đáp án. */
export function ListeningPdf({ title, hskLevel, transcript, questions, backHref }: Props) {
  return (
    <PrintableDoc title={title} hskLevel={hskLevel} backHref={backHref}>
      <p className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
        🎧 Nghe phần âm thanh trực tiếp tại dingdonghsk.com (bản PDF chỉ có lời thoại &amp; đáp án).
      </p>
      {transcript && (
        <section className="mb-8 space-y-2">
          <h2 className="text-base font-bold text-violet-700">Lời thoại (transcript)</h2>
          <p className="whitespace-pre-line font-chinese text-[15px] leading-loose text-zinc-900">{transcript}</p>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-violet-700">Câu hỏi &amp; đáp án</h2>
        <PdfQuestionList questions={questions} />
      </section>
    </PrintableDoc>
  );
}
