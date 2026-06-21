"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertCircle, Eye, RotateCcw } from "lucide-react";
import { FreehandPad } from "./freehand-pad";

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

export type StrokeMode = "trace" | "recall";

interface Props {
  /** Exactly one Han character. */
  char: string;
  mode: StrokeMode;
  size: number;
  showOutline: boolean;
  hintAfterMisses: number;
  /** Fired once when this cell is finished (quiz complete, or unsupported char). */
  onDone: () => void;
}

/**
 * A single character's writing box. Runs Hanzi Writer quiz mode so each stroke
 * is validated in order; a wrong stroke is rejected and, after `hintAfterMisses`
 * misses, the correct stroke flashes as a hint. If Hanzi Writer has no CDN
 * stroke data for the character, falls back to a freehand pad so the learner can
 * still practise. Stroke data is loaded from the library's CDN — none in our DB.
 */
export function StrokeCell({ char, mode, size, showOutline, hintAfterMisses, onDone }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<Writer | null>(null);
  // Keep the latest onDone without re-creating the writer when the parent
  // passes a fresh closure each render.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const [done, setDone] = useState(false);
  const [strokesLeft, setStrokesLeft] = useState<number | null>(null);
  const [mistake, setMistake] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  const startQuiz = useCallback(
    (writer: Writer) => {
      setDone(false);
      setMistake(false);
      setStrokesLeft(null);
      writer.quiz({
        leniency: 1.2,
        showHintAfterMisses: hintAfterMisses,
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
          onDoneRef.current();
        },
      });
    },
    [hintAfterMisses]
  );

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setDone(false);
    setStrokesLeft(null);
    setMistake(false);
    setUnsupported(false);

    import("hanzi-writer")
      .then((mod) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = "";
        const writer = mod.default.create(containerRef.current, char, {
          width: size,
          height: size,
          padding: 5,
          showCharacter: false,
          showOutline,
          showHintAfterMisses: hintAfterMisses,
          strokeColor: "#16a34a",
          outlineColor: "#d4d4d8",
          drawingColor: "#16a34a",
          highlightColor: "#86efac",
          onLoadCharDataError: () => {
            if (cancelled) return;
            setUnsupported(true);
            onDoneRef.current();
          },
        }) as unknown as Writer;
        writerRef.current = writer;
        startQuiz(writer);
      })
      .catch(() => {
        if (cancelled) return;
        setUnsupported(true);
        onDoneRef.current();
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = "";
      writerRef.current = null;
    };
  }, [char, size, showOutline, hintAfterMisses, startQuiz]);

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

  if (unsupported) {
    return (
      <div className="flex flex-col items-center gap-1">
        <FreehandPad char={char} size={size} />
        <span className="text-[11px] text-muted-foreground">Tự viết (chưa có nét mẫu)</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={containerRef}
        className="tianzi-grid rounded-lg bg-white"
        style={{ width: size, height: size }}
      />
      <div className="flex h-5 items-center justify-center gap-1 text-xs">
        {done ? (
          <span className="flex items-center gap-1 font-medium text-green-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đúng
          </span>
        ) : mistake ? (
          <span className="flex items-center gap-1 font-medium text-red-600">
            <AlertCircle className="h-3.5 w-3.5" /> Sai nét — theo gợi ý
          </span>
        ) : strokesLeft != null ? (
          <span className="text-muted-foreground">Còn {strokesLeft} nét</span>
        ) : (
          <span className="text-muted-foreground">Viết nét đầu…</span>
        )}
      </div>
      {!done && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={showSample}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <Eye className="h-3.5 w-3.5" /> Mẫu
          </button>
          <button
            type="button"
            onClick={restartQuiz}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Lại
          </button>
        </div>
      )}
    </div>
  );
}
