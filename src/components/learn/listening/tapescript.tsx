"use client";
import { Volume2, FileText } from "lucide-react";
import { PinyinText } from "@/components/learn/pinyin-text";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/transcript";

const SPEAKER_STYLES: Record<string, string> = {
  A: "bg-teal-100 text-teal-700",
  B: "bg-violet-100 text-violet-700",
};

function speakerStyle(speaker: string): string {
  return SPEAKER_STYLES[speaker.toUpperCase()] ?? "bg-zinc-100 text-zinc-600";
}

interface TapescriptProps {
  segments: TranscriptSegment[];
  showPinyin: boolean;
  /** segment index → list of question numbers (1-based) it answers. */
  evidenceMap: Map<number, number[]>;
  currentSegment: number | null;
  onPlaySegment: (i: number) => void;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
}

export function Tapescript({
  segments,
  showPinyin,
  evidenceMap,
  currentSegment,
  onPlaySegment,
  onCharClick,
}: TapescriptProps) {
  if (segments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Bài nghe này chưa có lời thoại (transcript).
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
        <FileText className="h-4 w-4" /> Lời thoại (transcript)
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Nhấn vào một câu để nghe lại; câu được tô màu là nơi chứa đáp án. Nhấn từng chữ để xem pinyin &amp; nghĩa.
      </p>

      <ol className="space-y-1.5">
        {segments.map((seg, i) => {
          const qs = evidenceMap.get(i);
          const isEvidence = !!qs && qs.length > 0;
          const isCurrent = currentSegment === i;
          return (
            <li
              key={i}
              className={cn(
                "group flex items-start gap-2 rounded-xl border p-2.5 transition-colors",
                isCurrent
                  ? "border-teal-400 bg-teal-50"
                  : isEvidence
                    ? "border-amber-200 bg-amber-50/60"
                    : "border-transparent hover:bg-muted/50",
              )}
            >
              {seg.speaker ? (
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    speakerStyle(seg.speaker),
                  )}
                >
                  {seg.speaker.toUpperCase()}
                </span>
              ) : (
                <span className="mt-0.5 h-6 w-6 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="font-chinese text-[15px] leading-relaxed">
                  <PinyinText text={seg.text} showPinyin={showPinyin} onWordClick={onCharClick} />
                </div>
                {isEvidence && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {qs!.map((n) => (
                      <span
                        key={n}
                        className="rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800"
                      >
                        Đáp án câu {n}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onPlaySegment(i)}
                aria-label="Nghe lại câu này"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-teal-100 hover:text-teal-700 group-hover:opacity-100"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
