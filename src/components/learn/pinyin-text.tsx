"use client";
import { useState } from "react";
import { toPinyinArray } from "@/lib/pinyin";
import { cn } from "@/lib/utils";

interface PinyinTextProps {
  text: string;
  showPinyin?: boolean;
  className?: string;
  onWordClick?: (char: string, pinyin: string) => void;
}

export function PinyinText({ text, showPinyin = false, className, onWordClick }: PinyinTextProps) {
  const segments = toPinyinArray(text);

  return (
    <span className={cn("font-chinese", className)}>
      {segments.map((seg, i) =>
        /\p{Script=Han}/u.test(seg.char) ? (
          <ruby
            key={i}
            className="cursor-pointer hover:bg-primary/10 rounded px-0.5 transition-colors"
            onClick={() => onWordClick?.(seg.char, seg.pinyin)}
          >
            {seg.char}
            <rt className={cn("font-pinyin", showPinyin ? "opacity-100" : "opacity-0")}>
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
