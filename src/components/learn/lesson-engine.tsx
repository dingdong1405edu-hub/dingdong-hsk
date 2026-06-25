"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HeartBar } from "./heart-bar";
import { MatchExerciseUI } from "./exercises/match-exercise";
import { TranslateExerciseUI } from "./exercises/translate-exercise";
import { ToneSelectExerciseUI } from "./exercises/tone-select-exercise";
import { SentenceOrderExerciseUI } from "./exercises/sentence-order-exercise";
import { PinyinMatchExerciseUI } from "./exercises/pinyin-match-exercise";
import { FillBlankExerciseUI } from "./exercises/fill-blank-exercise";
import type { Exercise } from "@/types";
import { X, CheckCircle2, XCircle } from "lucide-react";

interface LessonEngineProps {
  exercises: Exercise[];
  hearts: number;
  lessonId: string;
  unitId: string;
  skill: "vocab" | "grammar";
  /** Người trả phí/admin: tim không giới hạn — không trừ tim khi sai. */
  unlimited?: boolean;
  onComplete: (result: { correct: number; total: number; heartsLost: number }) => void;
}

type Feedback = "correct" | "wrong" | null;

export function LessonEngine({
  exercises,
  hearts: initialHearts,
  lessonId,
  skill,
  unlimited = false,
  onComplete,
}: LessonEngineProps) {
  const [current, setCurrent] = useState(0);
  const [hearts, setHearts] = useState(initialHearts);
  const [correct, setCorrect] = useState(0);
  const [heartsLost, setHeartsLost] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  const exercise = exercises[current];
  const progress = Math.round((current / exercises.length) * 100);

  const handleAnswer = useCallback(
    (isCorrect: boolean, answer?: string) => {
      if (feedback !== null) return;

      if (isCorrect) {
        setFeedback("correct");
        setCorrect((c) => c + 1);
      } else {
        setFeedback("wrong");
        // Người trả phí/admin: không trừ tim (giữ heartsLost = 0).
        if (!unlimited) {
          setHearts((h) => Math.max(0, h - 1));
          // Cap at the hearts the user actually had so we never report (or send)
          // more hearts lost than existed. Server also clamps defensively.
          setHeartsLost((h) => Math.min(initialHearts, h + 1));
        }
        if (answer) setCorrectAnswer(answer);
      }
    },
    [feedback, initialHearts, unlimited]
  );

  function advance() {
    setFeedback(null);
    setCorrectAnswer(null);
    if (current + 1 >= exercises.length) {
      onComplete({ correct, total: exercises.length, heartsLost });
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4">
        <Progress value={progress} className="flex-1 h-3" />
        <HeartBar hearts={hearts} unlimited={unlimited} />
      </div>

      {/* Exercise area */}
      <div className="flex-1 flex flex-col justify-center py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {exercise.type === "match" && (
              <MatchExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
            {exercise.type === "translate" && (
              <TranslateExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
            {exercise.type === "toneSelect" && (
              <ToneSelectExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
            {(exercise.type === "sentenceOrder" || exercise.type === "sentence_order") && (
              <SentenceOrderExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
            {exercise.type === "pinyinMatch" && (
              <PinyinMatchExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
            {exercise.type === "fill_blank" && (
              <FillBlankExerciseUI exercise={exercise as never} onAnswer={handleAnswer} disabled={feedback !== null} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feedback bar */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className={`fixed bottom-0 left-0 right-0 p-6 border-t ${
              feedback === "correct"
                ? "bg-green-50 dark:bg-green-500/15 border-green-200 dark:border-green-500/25"
                : "bg-red-50 dark:bg-red-500/15 border-red-200 dark:border-red-500/25"
            }`}
          >
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                {feedback === "correct" ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-300" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500 dark:text-red-300" />
                )}
                <div>
                  <div className={`font-bold ${feedback === "correct" ? "text-green-700 dark:text-green-300" : "text-red-600 dark:text-red-300"}`}>
                    {feedback === "correct" ? "Chính xác!" : "Sai rồi!"}
                  </div>
                  {correctAnswer && (
                    <div className="text-sm text-muted-foreground">
                      Đáp án đúng: <span className="font-chinese font-semibold">{correctAnswer}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={advance} className={feedback === "correct" ? "bg-green-600 hover:bg-green-700" : ""}>
                Tiếp tục
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
