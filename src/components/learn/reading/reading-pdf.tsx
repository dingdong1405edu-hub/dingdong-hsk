"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";
import { PdfQuestionList, type PdfQuestion } from "@/components/learn/pdf/pdf-question-list";

interface Props {
  title: string;
  titleZh?: string;
  hskLevel: string;
  passage: string;
  passagePinyin?: string | null;
  questions: PdfQuestion[];
  backHref: string;
}

/** PDF đọc hiểu: đoạn văn (kèm pinyin nếu có) + câu hỏi & đáp án. */
export function ReadingPdf({ title, titleZh, hskLevel, passage, passagePinyin, questions, backHref }: Props) {
  return (
    <PrintableDoc title={title} titleZh={titleZh} hskLevel={hskLevel} backHref={backHref}>
      <section className="mb-8 space-y-2">
        <h2 className="text-base font-bold text-violet-700">Đoạn văn</h2>
        <p className="whitespace-pre-line font-chinese text-[15px] leading-loose text-zinc-900">{passage}</p>
        {passagePinyin && (
          <p className="whitespace-pre-line font-serif text-xs leading-relaxed text-violet-600">{passagePinyin}</p>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-bold text-violet-700">Câu hỏi &amp; đáp án</h2>
        <PdfQuestionList questions={questions} />
      </section>
    </PrintableDoc>
  );
}
