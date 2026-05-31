"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MatchExercise } from "@/types";

interface Props {
  exercise: MatchExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function MatchExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<{ zh: string | null; vi: string | null }>({ zh: null, vi: null });
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  const pairs = exercise.pairs;
  const zhItems = pairs.map((p) => p.zh);
  const viItems = [...pairs.map((p) => p.vi)].sort(() => Math.random() - 0.5);

  function handleZh(zh: string) {
    if (disabled || matched.has(zh)) return;
    setSelected((s) => ({ ...s, zh }));
  }

  function handleVi(vi: string) {
    if (disabled || matched.has(vi)) return;
    setSelected((s) => ({ ...s, vi }));
  }

  useEffect(() => {
    if (!selected.zh || !selected.vi) return;
    const pair = pairs.find((p) => p.zh === selected.zh);
    if (pair?.vi === selected.vi) {
      setMatched((m) => new Set([...m, selected.zh!, selected.vi!]));
      setSelected({ zh: null, vi: null });
      if (matched.size + 2 >= pairs.length * 2) {
        setTimeout(() => onAnswer(true), 300);
      }
    } else {
      setWrong(`${selected.zh}-${selected.vi}`);
      setTimeout(() => {
        setWrong(null);
        setSelected({ zh: null, vi: null });
      }, 600);
    }
  }, [selected, pairs, matched, onAnswer]);

  const allMatched = matched.size >= pairs.length * 2;

  useEffect(() => {
    if (allMatched) onAnswer(true);
  }, [allMatched, onAnswer]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center">Nối từ với nghĩa tương ứng</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {zhItems.map((zh) => (
            <motion.button
              key={zh}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleZh(zh)}
              disabled={matched.has(zh)}
              className={cn(
                "w-full p-3 rounded-xl border-2 font-chinese text-xl font-semibold transition-all",
                matched.has(zh) && "opacity-30 border-green-300 bg-green-50",
                selected.zh === zh && !matched.has(zh) && "border-primary bg-primary/10",
                wrong?.startsWith(zh) && "border-red-400 bg-red-50 animate-wrong",
                !selected.zh || selected.zh === zh ? "" : "hover:border-zinc-300"
              )}
            >
              {zh}
            </motion.button>
          ))}
        </div>
        <div className="space-y-2">
          {viItems.map((vi) => (
            <motion.button
              key={vi}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleVi(vi)}
              disabled={matched.has(vi)}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-sm transition-all",
                matched.has(vi) && "opacity-30 border-green-300 bg-green-50",
                selected.vi === vi && !matched.has(vi) && "border-primary bg-primary/10",
                wrong?.endsWith(vi) && "border-red-400 bg-red-50 animate-wrong",
              )}
            >
              {vi}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
