"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { StrokeCell, type StrokeMode } from "./stroke-cell";

interface Props {
  /** A word/phrase — may be one or several Han characters. */
  character: string;
  /**
   * `trace`  — outline shown, learner writes over it (guided).
   * `recall` — blank grid, learner writes from memory; every stroke is still
   *            validated and a hint flashes the correct stroke after a miss.
   */
  mode?: StrokeMode;
  /** Called once every character has been written correctly. */
  onComplete?: () => void;
}

const MODE_CONFIG: Record<StrokeMode, { hint: string; showOutline: boolean; hintAfterMisses: number }> = {
  trace: {
    hint: "Viết theo nét mẫu — đúng thứ tự nét.",
    showOutline: true,
    hintAfterMisses: 2,
  },
  recall: {
    hint: "Tự viết lại chữ từ trí nhớ. Viết sai nét sẽ được sửa và gợi ý ngay.",
    showOutline: false,
    hintAfterMisses: 1,
  },
};

const isHan = (s: string) => /\p{Script=Han}/u.test(s);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Pick a writing-box size from the available width. One character gets a big
 * box (great on phones/tablets); multiple characters wrap into rows of
 * comfortably-sized boxes. `width` 0 means "not measured yet" — fall back to a
 * sensible default so the first paint isn't empty.
 */
function cellSizeFor(width: number, count: number): number {
  const W = width > 0 ? width : 320;
  const gap = 12;
  if (count <= 1) return clamp(W - 4, 220, 340);
  const minCell = 132;
  const maxCell = 220;
  let perRow = Math.max(1, Math.floor((W + gap) / (minCell + gap)));
  perRow = Math.min(perRow, count);
  const size = Math.floor((W - (perRow - 1) * gap) / perRow);
  return clamp(size, minCell, maxCell);
}

/**
 * Steps 2 & 3 of the per-word flow. Splits the word into individual Han
 * characters and gives each its own validated writing box (Hanzi Writer can
 * only load stroke data one character at a time, so a multi-character word like
 * 你好 must be split — otherwise the grid loads nothing and can't be written on).
 */
export function StrokeQuiz({ character, mode = "trace", onComplete }: Props) {
  const cfg = MODE_CONFIG[mode];
  const chars = useMemo(() => Array.from(character).filter(isHan), [character]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setContainerW(Math.round(el.getBoundingClientRect().width));
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setContainerW(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const size = cellSizeFor(containerW, chars.length);

  // Track which characters are finished. Reset whenever the word or mode changes.
  const doneSet = useRef<Set<number>>(new Set());
  const [doneCount, setDoneCount] = useState(0);
  useEffect(() => {
    doneSet.current = new Set();
    setDoneCount(0);
  }, [character, mode]);

  const handleCellDone = useCallback(
    (i: number) => {
      if (doneSet.current.has(i)) return;
      doneSet.current.add(i);
      const c = doneSet.current.size;
      setDoneCount(c);
      if (c >= chars.length) onComplete?.();
    },
    [chars.length, onComplete]
  );

  const allDone = chars.length > 0 && doneCount >= chars.length;

  if (chars.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Từ này không có chữ Hán để luyện viết.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="flex w-full flex-col items-center gap-3">
      <p className="text-center text-sm text-muted-foreground">{cfg.hint}</p>
      <div className="flex flex-wrap items-start justify-center gap-3">
        {chars.map((ch, i) => (
          <StrokeCell
            key={`${mode}-${i}-${ch}`}
            char={ch}
            mode={mode}
            size={size}
            showOutline={cfg.showOutline}
            hintAfterMisses={cfg.hintAfterMisses}
            onDone={() => handleCellDone(i)}
          />
        ))}
      </div>
      {allDone ? (
        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Viết đúng hết rồi!
        </div>
      ) : chars.length > 1 ? (
        <div className="text-xs text-muted-foreground">
          Đã viết đúng {doneCount}/{chars.length} chữ
        </div>
      ) : null}
    </div>
  );
}
