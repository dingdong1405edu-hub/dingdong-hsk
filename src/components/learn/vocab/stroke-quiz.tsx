"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";

/** Stroke data Hanzi Writer passes to the quiz callbacks (subset we use). */
interface StrokeInfo {
  strokeNum: number;
  mistakesOnStroke: number;
  totalMistakes: number;
  strokesRemaining: number;
}

interface QuizOptions {
  leniency?: number;
  showHintAfterMisses?: number;
  onMistake?: (info: StrokeInfo) => void;
  onCorrectStroke?: (info: StrokeInfo) => void;
  onComplete?: (summary: { totalMistakes: number }) => void;
}

// Minimal slice of the hanzi-writer instance API we use here.
interface Writer {
  quiz: (opts: QuizOptions) => void;
  animateCharacter: (opts?: { onComplete?: () => void }) => void;
  hideCharacter: () => void;
  cancelQuiz: () => void;
}

type Mode = "trace" | "recall";

interface Props {
  character: string;
  /**
   * `trace`  — outline shown, learner writes over it (guided).
   * `recall` — blank grid, learner writes from memory; every stroke is still
   *            validated and a hint flashes the correct stroke after a miss.
   */
  mode?: Mode;
  size?: number;
  /** Called once the learner finishes all strokes correctly. */
  onComplete?: () => void;
}

const MODE_CONFIG: Record<Mode, { hint: string; showOutline: boolean; hintAfterMisses: number }> = {
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

/**
 * Steps 2 & 3 of the per-word flow. Both run Hanzi Writer quiz mode so each
 * stroke is checked in order: a wrong stroke is rejected and, after
 * `hintAfterMisses` misses, the expected stroke is highlighted as a hint.
 * The only difference is whether the faint outline guide is shown (`trace`) or
 * hidden so the learner reproduces the character from memory (`recall`).
 * Stroke data is loaded by the library from its CDN — nothing is stored in our DB.
 */
export function StrokeQuiz({ character, mode = "trace", size = 240, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<Writer | null>(null);
  const [done, setDone] = useState(false);
  const [strokesLeft, setStrokesLeft] = useState<number | null>(null);
  const [mistake, setMistake] = useState(false);

  const cfg = MODE_CONFIG[mode];

  const startQuiz = useCallback(
    (writer: Writer) => {
      setDone(false);
      setMistake(false);
      setStrokesLeft(null);
      writer.quiz({
        leniency: 1.2,
        showHintAfterMisses: cfg.hintAfterMisses,
        onMistake: (info) => {
          setMistake(true);
          setStrokesLeft(info.strokesRemaining);
        },
        onCorrectStroke: (info) => {
          setMistake(false);
          setStrokesLeft(info.strokesRemaining);
        },
        onComplete: () => {
          setStrokesLeft(0);
          setMistake(false);
          setDone(true);
          onComplete?.();
        },
      });
    },
    [cfg.hintAfterMisses, onComplete]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setDone(false);
    setStrokesLeft(null);
    setMistake(false);

    import("hanzi-writer").then((mod) => {
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      const writer = mod.default.create(containerRef.current, character, {
        width: size,
        height: size,
        padding: 5,
        showCharacter: false,
        showOutline: cfg.showOutline,
        showHintAfterMisses: cfg.hintAfterMisses,
        strokeColor: "#16a34a",
        outlineColor: "#d4d4d8",
        drawingColor: "#16a34a",
        highlightColor: "#86efac",
      }) as unknown as Writer;
      writerRef.current = writer;
      startQuiz(writer);
    });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
      writerRef.current = null;
    };
  }, [character, size, cfg.showOutline, cfg.hintAfterMisses, startQuiz]);

  function restartQuiz() {
    const w = writerRef.current;
    if (!w) return;
    w.hideCharacter();
    startQuiz(w);
  }

  function showSample() {
    const w = writerRef.current;
    if (!w) return;
    w.cancelQuiz();
    w.animateCharacter({ onComplete: () => restartQuiz() });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">{cfg.hint}</p>
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
        <>
          <div className="flex h-5 items-center gap-1.5 text-sm">
            {mistake ? (
              <span className="flex items-center gap-1.5 font-medium text-red-600">
                <AlertCircle className="h-4 w-4" /> Sai nét — viết lại theo nét đang gợi ý.
              </span>
            ) : strokesLeft != null ? (
              <span className="text-muted-foreground">Còn {strokesLeft} nét</span>
            ) : (
              <span className="text-muted-foreground">Bắt đầu viết nét đầu tiên…</span>
            )}
          </div>
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
        </>
      )}
    </div>
  );
}
