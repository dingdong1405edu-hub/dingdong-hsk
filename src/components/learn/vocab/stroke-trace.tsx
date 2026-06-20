"use client";
import { useEffect, useRef, useState } from "react";
import { Eye, RotateCcw, CheckCircle2 } from "lucide-react";

// Minimal slice of the hanzi-writer instance API we use here.
interface Writer {
  quiz: (opts: {
    onComplete?: (summary: { totalMistakes: number }) => void;
    onCorrectStroke?: (info: { strokesRemaining: number }) => void;
    leniency?: number;
    showHintAfterMisses?: number;
  }) => void;
  animateCharacter: (opts?: { onComplete?: () => void }) => void;
  hideCharacter: () => void;
  cancelQuiz: () => void;
}

interface Props {
  character: string;
  size?: number;
  /** Called once the learner finishes tracing all strokes correctly. */
  onComplete?: () => void;
}

/**
 * Step 2 of the per-word flow: trace the character over a faint guide. Uses
 * Hanzi Writer quiz mode, which validates stroke order. Stroke data is loaded
 * by the library from its CDN — nothing is stored in our DB.
 */
export function StrokeTrace({ character, size = 240, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<Writer | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setDone(false);

    import("hanzi-writer").then((mod) => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const writer = mod.default.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: 5,
        showCharacter: false,
        showOutline: true,
        showHintAfterMisses: 2,
        strokeColor: "#16a34a",
        outlineColor: "#d4d4d8",
        drawingColor: "#16a34a",
        highlightColor: "#86efac",
      }) as unknown as Writer;
      writerRef.current = writer;
      writer.quiz({
        leniency: 1.2,
        showHintAfterMisses: 2,
        onComplete: () => {
          if (cancelled) return;
          setDone(true);
          onComplete?.();
        },
      });
    });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
      writerRef.current = null;
    };
  }, [character, size, onComplete]);

  function restartQuiz() {
    const w = writerRef.current;
    if (!w) return;
    setDone(false);
    w.hideCharacter();
    w.quiz({
      leniency: 1.2,
      showHintAfterMisses: 2,
      onComplete: () => {
        setDone(true);
        onComplete?.();
      },
    });
  }

  function showSample() {
    const w = writerRef.current;
    if (!w) return;
    w.animateCharacter({ onComplete: () => restartQuiz() });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">Viết theo nét mẫu — đúng thứ tự nét.</p>
      <div
        ref={containerRef}
        className="tianzi-grid rounded-lg bg-white"
        style={{ width: size, height: size }}
      />
      {done ? (
        <div className="flex items-center gap-1.5 text-sm font-medium text-green-600">
          <CheckCircle2 className="h-4 w-4" /> Viết đúng rồi!
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={showSample}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Eye className="h-4 w-4" /> Xem mẫu
          </button>
          <button
            type="button"
            onClick={restartQuiz}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <RotateCcw className="h-4 w-4" /> Viết lại
          </button>
        </div>
      )}
    </div>
  );
}
