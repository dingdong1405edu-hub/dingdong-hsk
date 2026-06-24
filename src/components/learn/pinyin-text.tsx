"use client";
import { useMemo } from "react";
import { toPinyinArray } from "@/lib/pinyin";
import { cn } from "@/lib/utils";

interface PinyinTextProps {
  text: string;
  showPinyin?: boolean;
  className?: string;
  /** Fired when a Han character is tapped — `e` anchors a popup, `index` is the segment position. */
  onWordClick?: (char: string, pinyin: string, e: React.MouseEvent, index: number) => void;
  /** Tô nền cho các segment theo vị trí: { [index]: cssColor }. Dùng cho bút highlight. */
  highlights?: Record<number, string>;
  /** Các segment thuộc "chỗ chứa đáp án" — tô kiểu riêng (gạch chân) khi xem lại bài. */
  evidence?: Set<number>;
}

export function PinyinText({ text, showPinyin = false, className, onWordClick, highlights, evidence }: PinyinTextProps) {
  // Per-grapheme segmentation + pinyin is pure work over `text`; memoize so
  // toggling pinyin / re-rendering the workspace doesn't re-segment every time.
  const segments = useMemo(() => toPinyinArray(text), [text]);

  return (
    <span className={cn("font-chinese", className)}>
      {segments.map((seg, i) => {
        const hl = highlights?.[i];
        const hlStyle = hl ? { backgroundColor: hl } : undefined;
        const isEvidence = evidence?.has(i);
        return /\p{Script=Han}/u.test(seg.char) ? (
          <ruby
            key={i}
            data-idx={i}
            className={cn("cursor-pointer rounded px-0.5 transition-colors", isEvidence && "reading-evidence")}
            style={hlStyle}
            onClick={(e) => {
              // Bỏ qua click ở cuối thao tác kéo bôi đen — để popup tra cụm (SelectionLookup)
              // không bị popup 1-chữ (CharLookup) ghi đè ngay sau đó.
              const sel = typeof window !== "undefined" ? window.getSelection() : null;
              if (sel && !sel.isCollapsed && sel.toString().trim()) return;
              onWordClick?.(seg.char, seg.pinyin, e, i);
            }}
          >
            {seg.char}
            <rt className={cn("font-pinyin transition-opacity", showPinyin ? "opacity-100" : "opacity-0")}>
              {seg.pinyin}
            </rt>
          </ruby>
        ) : (
          <span key={i} data-idx={i} style={hlStyle} className={cn(isEvidence && "reading-evidence")}>
            {seg.char}
          </span>
        );
      })}
    </span>
  );
}
