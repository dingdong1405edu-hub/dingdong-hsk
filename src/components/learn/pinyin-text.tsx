"use client";
import { useMemo } from "react";
import { toPinyinArray } from "@/lib/pinyin";
import { cn } from "@/lib/utils";

interface PinyinTextProps {
  text: string;
  showPinyin?: boolean;
  className?: string;
  /** Fired when a Han character is tapped — `e` lets the caller anchor a popup. */
  onWordClick?: (char: string, pinyin: string, e: React.MouseEvent) => void;
}

export function PinyinText({ text, showPinyin = false, className, onWordClick }: PinyinTextProps) {
  // Per-grapheme segmentation + pinyin is pure work over `text`; memoize so
  // toggling pinyin / re-rendering the workspace doesn't re-segment every time.
  const segments = useMemo(() => toPinyinArray(text), [text]);

  return (
    <span className={cn("font-chinese", className)}>
      {segments.map((seg, i) =>
        /\p{Script=Han}/u.test(seg.char) ? (
          <ruby
            key={i}
            className="cursor-pointer rounded px-0.5 transition-colors"
            onClick={(e) => onWordClick?.(seg.char, seg.pinyin, e)}
          >
            {seg.char}
            <rt className={cn("font-pinyin transition-opacity", showPinyin ? "opacity-100" : "opacity-0")}>
              {seg.pinyin}
            </rt>
          </ruby>
        ) : (
          <span key={i}>{seg.char}</span>
        )
      )}
    </span>
  );
}
