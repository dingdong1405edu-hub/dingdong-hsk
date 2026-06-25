"use client";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { PinyinMatchExercise } from "@/types";

interface Props {
  exercise: PinyinMatchExercise;
  onAnswer: (correct: boolean) => void;
  disabled: boolean;
}

export function PinyinMatchExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [selZh, setSelZh] = useState<string | null>(null);
  const [selPy, setSelPy] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  const pairs = exercise.pairs;
  // Shuffle once per exercise (see match-exercise.tsx) to stop the column from
  // re-randomizing on every render.
  const pinyins = useMemo(
    () => [...pairs.map((p) => p.pinyin)].sort(() => Math.random() - 0.5),
    [pairs]
  );

  useEffect(() => {
    if (!selZh || !selPy) return;
    const pair = pairs.find((p) => p.zh === selZh);
    if (pair?.pinyin === selPy) {
      const newMatched = new Set([...matched, selZh, selPy]);
      setMatched(newMatched);
      setSelZh(null);
      setSelPy(null);
      if (newMatched.size >= pairs.length * 2) {
        setTimeout(() => onAnswer(true), 300);
      }
    } else {
      setWrong(`${selZh}-${selPy}`);
      setTimeout(() => {
        setWrong(null);
        setSelZh(null);
        setSelPy(null);
      }, 600);
    }
  }, [selZh, selPy, pairs, matched, onAnswer]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-center">Nối Hán tự với pinyin</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map(({ zh }) => (
            <motion.button
              key={zh}
              whileTap={{ scale: 0.97 }}
              onClick={() => !matched.has(zh) && setSelZh(zh)}
              disabled={matched.has(zh)}
              className={cn(
                "w-full p-4 rounded-xl border-2 font-chinese text-2xl font-bold transition-all",
                matched.has(zh) && "opacity-30",
                selZh === zh && "border-primary bg-primary/10",
                wrong?.startsWith(zh) && "border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/15"
              )}
            >
              {zh}
            </motion.button>
          ))}
        </div>
        <div className="space-y-2">
          {pinyins.map((py) => (
            <motion.button
              key={py}
              whileTap={{ scale: 0.97 }}
              onClick={() => !matched.has(py) && setSelPy(py)}
              disabled={matched.has(py)}
              className={cn(
                "w-full p-4 rounded-xl border-2 font-pinyin transition-all",
                matched.has(py) && "opacity-30",
                selPy === py && "border-primary bg-primary/10",
                wrong?.endsWith(py) && "border-red-400 dark:border-red-500/40 bg-red-50 dark:bg-red-500/15"
              )}
            >
              {py}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
