"use client";
import { cn } from "@/lib/utils";

interface ReadingPaletteProps {
  total: number;
  answered: boolean[];
  flagged: boolean[];
  current?: number;
  correctness?: (boolean | undefined)[];
  onJump: (i: number) => void;
}

export function ReadingPalette({ total, answered, flagged, current, correctness, onJump }: ReadingPaletteProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
      {Array.from({ length: total }).map((_, i) => {
        const c = correctness?.[i];
        const isFlagged = flagged[i];
        return (
          <button
            key={i}
            onClick={() => onJump(i)}
            className={cn(
              "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
              c === true
                ? "border-emerald-500 bg-emerald-500 text-white"
                : c === false
                  ? "border-rose-500 bg-rose-500 text-white"
                  : i === current
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered[i]
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-input bg-background text-muted-foreground hover:border-primary/40",
              isFlagged && c === undefined && "ring-2 ring-amber-400 ring-offset-1",
            )}
          >
            {i + 1}
            {isFlagged && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
