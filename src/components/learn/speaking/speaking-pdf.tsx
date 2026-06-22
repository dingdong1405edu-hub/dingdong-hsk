"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";

interface Sentence {
  text: string;
  pinyin?: string;
}
interface Question {
  question: string;
  pinyin?: string;
}

interface Props {
  title: string;
  hskLevel: string;
  part1: Sentence[];
  part2: Sentence | null;
  part3: Question[];
  backHref: string;
}

function PartBlock({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 space-y-2">
      <h2 className="text-base font-bold text-violet-700">
        Phần {n} · {label}
      </h2>
      {children}
    </section>
  );
}

/** PDF luyện nói (HSKK): 3 phần — lặp câu, đọc đoạn, trả lời câu hỏi. */
export function SpeakingPdf({ title, hskLevel, part1, part2, part3, backHref }: Props) {
  return (
    <PrintableDoc title={title || "Bài luyện nói"} hskLevel={hskLevel} backHref={backHref}>
      {part1.length > 0 && (
        <PartBlock n={1} label="Lặp lại câu (复述)">
          <ol className="space-y-1.5">
            {part1.map((s, i) => (
              <li key={i} className="break-inside-avoid">
                <span className="font-chinese text-[15px] text-zinc-900">{i + 1}. {s.text}</span>
                {s.pinyin && <span className="ml-2 font-serif text-xs text-violet-600">{s.pinyin}</span>}
              </li>
            ))}
          </ol>
        </PartBlock>
      )}
      {part2 && part2.text && (
        <PartBlock n={2} label="Đọc đoạn văn (朗读)">
          <p className="whitespace-pre-line font-chinese text-[15px] leading-loose text-zinc-900">{part2.text}</p>
          {part2.pinyin && (
            <p className="whitespace-pre-line font-serif text-xs leading-relaxed text-violet-600">{part2.pinyin}</p>
          )}
        </PartBlock>
      )}
      {part3.length > 0 && (
        <PartBlock n={3} label="Trả lời câu hỏi (回答问题)">
          <ol className="space-y-1.5">
            {part3.map((q, i) => (
              <li key={i} className="break-inside-avoid">
                <span className="font-chinese text-[15px] text-zinc-900">{i + 1}. {q.question}</span>
                {q.pinyin && <span className="ml-2 font-serif text-xs text-violet-600">{q.pinyin}</span>}
              </li>
            ))}
          </ol>
        </PartBlock>
      )}
    </PrintableDoc>
  );
}
