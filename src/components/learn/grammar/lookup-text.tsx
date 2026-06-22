"use client";
import { useMemo, useState } from "react";
import { toPinyinArray } from "@/lib/pinyin";
import { CharLookup, type LookupAnchor } from "@/components/learn/reading/char-lookup";
import { cn } from "@/lib/utils";

interface LookupTextProps {
  text: string;
  className?: string;
}

/**
 * Renders a Chinese context sentence where every Han character is underlined
 * (gạch chân) to signal it's tappable: tapping pops up its pinyin + meaning via
 * the shared reading CharLookup. Use this only on CONTEXT text (the sentence the
 * learner reads), never on answer options — otherwise it would reveal the
 * answer. Non-Han characters (Latin, punctuation, Vietnamese) render plainly and
 * are not interactive. Pinyin is shown only in the popup, so unlike <ruby> this
 * reserves no annotation space above the line.
 */
export function LookupText({ text, className }: LookupTextProps) {
  const segments = useMemo(() => toPinyinArray(text), [text]);
  const [anchor, setAnchor] = useState<LookupAnchor | null>(null);

  return (
    <>
      <span className={cn("font-chinese", className)}>
        {segments.map((seg, i) =>
          /\p{Script=Han}/u.test(seg.char) ? (
            <span
              key={i}
              role="button"
              tabIndex={0}
              onClick={(e) =>
                setAnchor({ char: seg.char, pinyin: seg.pinyin, x: e.clientX, y: e.clientY })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  setAnchor({ char: seg.char, pinyin: seg.pinyin, x: r.left + r.width / 2, y: r.bottom });
                }
              }}
              className="cursor-pointer rounded underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 transition-colors hover:bg-primary/10 hover:decoration-primary"
            >
              {seg.char}
            </span>
          ) : (
            <span key={i}>{seg.char}</span>
          )
        )}
      </span>
      {anchor && <CharLookup anchor={anchor} onClose={() => setAnchor(null)} />}
    </>
  );
}
