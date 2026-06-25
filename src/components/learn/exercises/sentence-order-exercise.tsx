"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SentenceOrderExercise } from "@/types";

interface Props {
  exercise: SentenceOrderExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function SentenceOrderExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [bank, setBank] = useState<string[]>(() => [...exercise.words].sort(() => Math.random() - 0.5));
  const [chosen, setChosen] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function pickWord(word: string, idx: number) {
    if (disabled || submitted) return;
    setBank((b) => b.filter((_, i) => i !== idx));
    setChosen((c) => [...c, word]);
  }

  function removeWord(word: string, idx: number) {
    if (disabled || submitted) return;
    setChosen((c) => c.filter((_, i) => i !== idx));
    setBank((b) => [...b, word]);
  }

  function submit() {
    const attempt = chosen.join("");
    const correct = attempt === exercise.answer;
    setSubmitted(true);
    onAnswer(correct, exercise.answer);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">Sắp xếp thành câu đúng</p>
        {(exercise.hint ?? exercise.meaning) && (
          <p className="text-muted-foreground text-sm italic">"{exercise.hint ?? exercise.meaning}"</p>
        )}
      </div>

      {/* Drop zone */}
      <div className="min-h-16 border-2 border-dashed rounded-xl p-4 flex flex-wrap gap-2 items-center">
        {chosen.length === 0 ? (
          <span className="text-muted-foreground text-sm">Chọn từ bên dưới...</span>
        ) : (
          chosen.map((w, i) => (
            <motion.button
              key={`${w}-${i}`}
              layout
              onClick={() => removeWord(w, i)}
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 font-chinese font-semibold hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-500/15 dark:hover:border-red-500/40"
            >
              {w}
            </motion.button>
          ))
        )}
      </div>

      {/* Word bank */}
      <div className="flex flex-wrap gap-2 justify-center">
        {bank.map((w, i) => (
          <motion.button
            key={`bank-${w}-${i}`}
            layout
            onClick={() => pickWord(w, i)}
            className="px-3 py-2 rounded-lg border-2 font-chinese font-semibold hover:border-primary/50 hover:bg-primary/5"
          >
            {w}
          </motion.button>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={chosen.length === 0 || disabled}
        onClick={submit}
      >
        Kiểm tra
      </Button>
    </div>
  );
}
