"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";

interface PdfExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
interface PdfWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  examples: PdfExample[];
}

interface Props {
  lessonTitle: string;
  unitTitle: string;
  unitTitleZh?: string;
  hskLevel: string;
  words: PdfWord[];
  backHref: string;
}

/** PDF từ vựng: danh sách từ (Hán · pinyin · nghĩa) kèm câu ví dụ. */
export function VocabPdf({ lessonTitle, unitTitle, unitTitleZh, hskLevel, words, backHref }: Props) {
  return (
    <PrintableDoc
      title={lessonTitle || "Bài từ vựng"}
      subtitle={unitTitle}
      titleZh={unitTitleZh}
      hskLevel={hskLevel}
      backHref={backHref}
    >
      <h2 className="mb-3 text-base font-bold text-violet-700">Danh sách từ ({words.length})</h2>
      {words.length === 0 ? (
        <p className="text-sm text-zinc-500">Bài này chưa có từ.</p>
      ) : (
        <ol className="space-y-2.5">
          {words.map((w, i) => (
            <li key={w.id} className="break-inside-avoid rounded-lg border border-zinc-200 p-3">
              <div className="flex items-baseline gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                  {i + 1}
                </span>
                <span className="font-chinese text-2xl font-bold text-zinc-900">{w.hanzi}</span>
                <span className="font-serif text-sm text-violet-600">{w.pinyin}</span>
                <span className="text-zinc-700">{w.meaning}</span>
              </div>
              {w.examples.length > 0 && (
                <ul className="mt-1.5 space-y-1 pl-9">
                  {w.examples.map((ex, j) => (
                    <li key={j} className="text-[13px]">
                      <span className="font-chinese text-zinc-900">{ex.hanzi}</span>
                      {ex.pinyin && <span className="ml-1.5 font-serif text-xs text-violet-600">{ex.pinyin}</span>}
                      {ex.meaning && <span className="ml-1.5 text-zinc-600">— {ex.meaning}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </PrintableDoc>
  );
}
