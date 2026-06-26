"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";
import { cn } from "@/lib/utils";

interface PdfExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
interface PdfChar {
  character: string;
  pinyin: string;
  tone: number;
  meaning: string;
  strokeCount: number;
  examples: PdfExample[];
}

interface Props {
  lessonTitle: string;
  hskLevel: string;
  characters: PdfChar[];
  backHref: string;
}

/** Một ô 田字格 (kẻ ô vuông có gạch chéo nét đứt) — có thể chứa chữ mẫu hoặc để trống tập viết. */
function TianGrid({ char, size = 48, guide = false }: { char?: string; size?: number; guide?: boolean }) {
  return (
    <div className="relative shrink-0 border border-zinc-300" style={{ width: size, height: size }}>
      <div className="absolute left-1/2 top-0 h-full -translate-x-1/2 border-l border-dashed border-zinc-200" />
      <div className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-t border-dashed border-zinc-200" />
      {char && (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-chinese leading-none",
            guide ? "text-zinc-800" : "text-zinc-200",
          )}
          style={{ fontSize: Math.round(size * 0.62) }}
        >
          {char}
        </span>
      )}
    </div>
  );
}

/** PDF luyện viết chữ Hán: mỗi chữ kèm pinyin · nghĩa · số nét, ô mẫu 田字格 và một hàng ô trống để tập viết. */
export function HanziPdf({ lessonTitle, hskLevel, characters, backHref }: Props) {
  return (
    <PrintableDoc title={lessonTitle || "Bài luyện viết chữ Hán"} subtitle="Lộ trình · Chữ Hán" hskLevel={hskLevel} backHref={backHref}>
      <h2 className="mb-3 text-base font-bold text-violet-700">Danh sách chữ ({characters.length})</h2>
      {characters.length === 0 ? (
        <p className="text-sm text-zinc-500">Bài này chưa có chữ Hán.</p>
      ) : (
        <ol className="space-y-3">
          {characters.map((c, i) => (
            <li key={i} className="break-inside-avoid rounded-lg border border-zinc-200 p-3">
              <div className="flex items-start gap-3">
                <TianGrid char={c.character} size={56} guide />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-xs font-bold text-zinc-400">{i + 1}.</span>
                    <span className="font-serif text-lg text-violet-600">{c.pinyin}</span>
                    <span className="text-zinc-700">{c.meaning}</span>
                    {c.strokeCount > 0 && <span className="text-xs text-zinc-400">· {c.strokeCount} nét</span>}
                  </div>
                  {c.examples.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {c.examples.map((ex, j) => (
                        <li key={j} className="text-[13px]">
                          <span className="font-chinese text-zinc-900">{ex.hanzi}</span>
                          {ex.pinyin && <span className="ml-1.5 font-serif text-xs text-violet-600">{ex.pinyin}</span>}
                          {ex.meaning && <span className="ml-1.5 text-zinc-600">— {ex.meaning}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {/* Hàng ô trống để tập viết */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Array.from({ length: 10 }).map((_, k) => (
                  <TianGrid key={k} size={38} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </PrintableDoc>
  );
}
