"use client";
import { useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { matchesAccepted } from "@/lib/grammar";
import { playWord } from "@/lib/speech";
import { LookupText } from "@/components/learn/grammar/lookup-text";
import type { AnswerQuestionExercise } from "@/types";

interface Props {
  exercise: AnswerQuestionExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function AnswerQuestionExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Chinese IME: while a candidate is being composed, Enter confirms it rather
  // than submitting the answer (CLAUDE.md §13).
  const composingRef = useRef(false);

  function submit() {
    if (disabled || submitted || !value.trim()) return;
    setSubmitted(true);
    onAnswer(matchesAccepted(value, exercise.accept), exercise.sampleAnswer);
  }

  const locked = disabled || submitted;

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">Trả lời câu hỏi</p>
        <div className="rounded-xl bg-muted/50 p-4">
          <div className="inline-flex items-center gap-2">
            <LookupText text={exercise.question} className="text-xl font-semibold" />
            <button
              type="button"
              onClick={() => playWord({ hanzi: exercise.question })}
              aria-label="Nghe câu hỏi"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          {exercise.questionPinyin && (
            <p className="mt-1 text-sm text-muted-foreground">{exercise.questionPinyin}</p>
          )}
        </div>
        {exercise.hint && (
          <p className="text-sm italic text-muted-foreground">Gợi ý: {exercise.hint}</p>
        )}
      </div>

      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => (composingRef.current = false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !composingRef.current) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={locked}
        placeholder="Gõ câu trả lời bằng tiếng Trung…"
        lang="zh"
        className={cn("h-12 text-center font-chinese text-lg", submitted && "opacity-100")}
      />

      <Button className="w-full" disabled={!value.trim() || locked} onClick={submit}>
        Kiểm tra
      </Button>
    </div>
  );
}
