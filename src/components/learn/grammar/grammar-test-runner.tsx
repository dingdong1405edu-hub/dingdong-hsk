"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { FlowHeader } from "./flow-header";
import { ExerciseRenderer } from "../exercises/exercise-renderer";
import { cn, formatDuration } from "@/lib/utils";
import type { Exercise, GrammarTest } from "@/types";

export interface TestResult {
  correct: number;
  total: number;
  /** Đúng/sai từng câu theo thứ tự — để màn chữa bài chỉ ra câu sai. */
  results: boolean[];
}

interface Props {
  test: GrammarTest;
  closeHref: string;
  onReviewTheory?: () => void;
  onDone: (result: TestResult) => void;
}

/** The comprehensive end-of-lesson test (exam format): every question counts,
 *  no hearts, no per-question reveal/feedback bar — the score is only shown
 *  once, on the lesson summary. Optional countdown auto-submits on expiry with
 *  unanswered questions graded as wrong. */
export function GrammarTestRunner({ test, closeHref, onReviewTheory, onDone }: Props) {
  const questions = test.questions;
  const total = questions.length;

  const [index, setIndex] = useState(0);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(() => {
    const t = test.timeLimit;
    return typeof t === "number" && t > 0 ? t : null;
  });
  const correctRef = useRef(0);
  const resultsRef = useRef<boolean[]>([]);
  const doneRef = useRef(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending advance timer if the runner unmounts mid-question (e.g.
  // the learner taps the close button) so it never sets state after unmount.
  useEffect(() => {
    return () => {
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone({ correct: correctRef.current, total, results: resultsRef.current.slice() });
  }

  // Countdown tick. When it hits 0, submit whatever has been answered so far.
  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      finish();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  function handleAnswer(isCorrect: boolean) {
    if (locked || doneRef.current) return;
    setLocked(true);
    resultsRef.current[index] = isCorrect;
    if (isCorrect) correctRef.current += 1;
    // Brief pause so the choice registers, then move on — no feedback bar.
    advanceRef.current = setTimeout(() => {
      advanceRef.current = null;
      if (doneRef.current) return;
      if (index + 1 >= total) {
        finish();
      } else {
        setIndex((i) => i + 1);
        setLocked(false);
      }
    }, 450);
  }

  const exercise: Exercise = questions[index];
  const progress = Math.round((index / total) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      <FlowHeader progress={progress} closeHref={closeHref} onReviewTheory={onReviewTheory} />

      <div className="flex items-center justify-between pb-2 text-sm text-muted-foreground">
        <span>
          Bài kiểm tra · Câu {index + 1}/{total}
        </span>
        {remaining !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium tabular-nums",
              remaining <= 10 && "text-red-600"
            )}
          >
            <Clock className="h-4 w-4" /> {formatDuration(Math.max(0, remaining))}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ExerciseRenderer exercise={exercise} onAnswer={handleAnswer} disabled={locked} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
