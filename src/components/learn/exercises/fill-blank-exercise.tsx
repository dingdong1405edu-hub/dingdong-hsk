"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FillBlankExercise } from "@/types";

interface Props {
  exercise: FillBlankExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function FillBlankExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const parts = exercise.sentence.split("___");

  function handleSelect(opt: string) {
    if (disabled || selected !== null) return;
    setSelected(opt);
    onAnswer(opt === exercise.blank, exercise.blank);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">Điền từ còn thiếu</p>
        <div className="text-2xl font-chinese font-semibold bg-muted/50 rounded-xl p-4">
          {parts[0]}
          <span
            className={cn(
              "inline-block border-b-2 min-w-[3rem] px-2 mx-1",
              selected === null ? "border-primary" : selected === exercise.blank ? "border-green-500 text-green-700" : "border-red-400 text-red-600"
            )}
          >
            {selected ?? "___"}
          </span>
          {parts[1]}
        </div>
        {exercise.hint && <p className="text-sm text-muted-foreground italic">Gợi ý: {exercise.hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {exercise.options.map((opt) => (
          <motion.button
            key={opt}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect(opt)}
            disabled={disabled}
            className={cn(
              "p-3 rounded-xl border-2 font-chinese font-semibold text-lg transition-all",
              selected === null && "hover:border-primary/50 hover:bg-primary/5",
              selected === opt && opt === exercise.blank && "border-green-500 bg-green-50",
              selected === opt && opt !== exercise.blank && "border-red-400 bg-red-50",
              selected && selected !== opt && opt === exercise.blank && "border-green-300 bg-green-50/50"
            )}
          >
            {opt}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
