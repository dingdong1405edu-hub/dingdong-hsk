"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ToneSelectExercise } from "@/types";

interface Props {
  exercise: ToneSelectExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

const TONE_COLORS = ["text-red-500", "text-green-500", "text-blue-500", "text-purple-500", "text-zinc-400"];

export function ToneSelectExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  function handleSelect(idx: number) {
    if (disabled || selected !== null) return;
    setSelected(idx);
    onAnswer(idx === exercise.correct, exercise.options[exercise.correct]);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">{exercise.question}</p>
        <div className="text-6xl font-chinese font-bold">{exercise.word}</div>
        <div className="font-pinyin text-xl text-muted-foreground">{exercise.pinyin}</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((opt, idx) => (
          <motion.button
            key={idx}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(idx)}
            disabled={disabled}
            className={cn(
              "p-4 rounded-xl border-2 font-semibold transition-all",
              selected === null && "hover:border-primary/50 hover:bg-primary/5",
              selected === idx && idx === exercise.correct && "border-green-500 bg-green-50",
              selected === idx && idx !== exercise.correct && "border-red-400 bg-red-50",
              selected !== null && selected !== idx && idx === exercise.correct && "border-green-300 bg-green-50/50"
            )}
          >
            <span className={TONE_COLORS[idx] ?? ""}>{opt}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
