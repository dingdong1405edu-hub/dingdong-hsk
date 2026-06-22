"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FlowHeader } from "./flow-header";
import { ExerciseRenderer } from "../exercises/exercise-renderer";
import type { Exercise } from "@/types";

export interface FlashResult {
  correct: number;
  wrong: number;
  skipped: number;
}

interface Props {
  flashcards: Exercise[];
  closeHref: string;
  /** Prefix for the progress line, e.g. "Phần 2/4" — identifies which section
   *  this practice belongs to in the interleaved flow. */
  label?: string;
  onReviewTheory?: () => void;
  onDone: (result: FlashResult) => void;
}

type Feedback = "correct" | "wrong" | null;

/** Han-script detection — translate answers can be Vietnamese (zh_to_vi), so the
 *  Chinese typeface should only apply when the reference answer is actually CJK. */
const hasHan = (s: string) => /\p{Script=Han}/u.test(s);

/** The memorisation phase: drills the learner one card at a time. Risk-free
 *  (no hearts). Any card can be skipped — skipped cards are excluded from the
 *  score entirely (they neither help nor hurt). */
export function FlashcardPhase({ flashcards, closeHref, label, onReviewTheory, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [skipped, setSkipped] = useState(0);

  const exercise = flashcards[index];
  const progress = Math.round((index / flashcards.length) * 100);

  function handleAnswer(isCorrect: boolean, answer?: string) {
    if (feedback !== null) return;
    if (isCorrect) {
      setFeedback("correct");
      setCorrect((c) => c + 1);
    } else {
      setFeedback("wrong");
      setWrong((w) => w + 1);
      if (answer) setCorrectAnswer(answer);
    }
  }

  // Counters are already up to date here (the answer that produced this feedback
  // re-rendered before the user pressed "Tiếp tục").
  function advanceAfterAnswer() {
    if (index + 1 >= flashcards.length) {
      onDone({ correct, wrong, skipped });
      return;
    }
    setFeedback(null);
    setCorrectAnswer(null);
    setIndex((i) => i + 1);
  }

  function skip() {
    if (feedback !== null) return;
    const nextSkipped = skipped + 1;
    setSkipped(nextSkipped);
    if (index + 1 >= flashcards.length) {
      onDone({ correct, wrong, skipped: nextSkipped });
      return;
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      <FlowHeader progress={progress} closeHref={closeHref} onReviewTheory={onReviewTheory} />

      <div className="pb-2 text-center text-sm text-muted-foreground">
        {label ? `${label} · ` : ""}Luyện tập · Thẻ {index + 1}/{flashcards.length}
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
            <ExerciseRenderer
              exercise={exercise}
              onAnswer={handleAnswer}
              disabled={feedback !== null}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Skip is only offered before answering — once answered, "Tiếp tục" advances. */}
      {feedback === null && (
        <div className="flex justify-center border-t py-4">
          <Button variant="ghost" onClick={skip} className="gap-1.5 text-muted-foreground">
            <SkipForward className="h-4 w-4" /> Bỏ qua
          </Button>
        </div>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-0 left-0 right-0 max-h-[55dvh] overflow-y-auto border-t p-6 ${
              feedback === "correct" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
            }`}
          >
            <div className="mx-auto flex max-w-2xl items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                {feedback === "correct" ? (
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600" />
                ) : (
                  <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 space-y-1">
                  <div
                    className={`font-bold ${
                      feedback === "correct" ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {feedback === "correct" ? "Chính xác!" : "Chưa đúng"}
                  </div>
                  {feedback === "wrong" && correctAnswer && (
                    <div className="text-sm text-muted-foreground">
                      Sửa lại đúng:{" "}
                      <span className={cn("font-semibold text-foreground", hasHan(correctAnswer) && "font-chinese")}>
                        {correctAnswer}
                      </span>
                    </div>
                  )}
                  {feedback === "correct" && correctAnswer && (
                    <div className="text-sm text-muted-foreground">
                      Đáp án đúng:{" "}
                      <span className={cn("font-semibold", hasHan(correctAnswer) && "font-chinese")}>
                        {correctAnswer}
                      </span>
                    </div>
                  )}
                  {feedback === "wrong" && exercise?.explanation && (
                    <div className="text-sm leading-relaxed text-muted-foreground">
                      <span className="font-medium text-foreground">Giải thích: </span>
                      {exercise.explanation}
                    </div>
                  )}
                </div>
              </div>
              <Button
                onClick={advanceAfterAnswer}
                className={cn("shrink-0", feedback === "correct" && "bg-green-600 hover:bg-green-700")}
              >
                Tiếp tục
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
