"use client";
import { MapPin, Volume2, Bookmark, BookmarkCheck, Headphones } from "lucide-react";
import { PinyinText } from "@/components/learn/pinyin-text";
import { cn } from "@/lib/utils";
import type { TranscriptSegment } from "@/lib/transcript";

interface QuestionEvidenceProps {
  segment: TranscriptSegment | null;
  showPinyin: boolean;
  canReplay: boolean;
  onPlay: () => void;
  saved: boolean;
  onToggleSave: () => void;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
}

/** Shown under a question in review mode: where the answer comes from in the
 *  audio + a one-tap replay of that sentence + save-for-later (ôn tập). */
export function QuestionEvidence({
  segment,
  showPinyin,
  canReplay,
  onPlay,
  saved,
  onToggleSave,
  onCharClick,
}: QuestionEvidenceProps) {
  return (
    <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700">
          <MapPin className="h-3.5 w-3.5" /> Đáp án nằm ở đoạn này
        </span>
        <button
          type="button"
          onClick={onToggleSave}
          className={cn(
            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
            saved ? "bg-amber-100 text-amber-700" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Đã lưu ôn tập" : "Lưu ôn tập"}
        </button>
      </div>

      {segment ? (
        <div className="mt-2 flex items-start gap-2">
          {segment.speaker && (
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-teal-700">
              {segment.speaker.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1 font-chinese text-sm leading-relaxed">
            <PinyinText text={segment.text} showPinyin={showPinyin} onWordClick={onCharClick} />
          </div>
          {canReplay && (
            <button
              type="button"
              onClick={onPlay}
              aria-label="Nghe lại đoạn này"
              className="shrink-0 rounded-lg border border-teal-300 bg-white p-1.5 text-teal-700 transition-colors hover:bg-teal-100"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Headphones className="h-3.5 w-3.5" /> Không tự dò được vị trí — hãy nghe lại toàn bộ lời thoại bên dưới.
        </p>
      )}
    </div>
  );
}
