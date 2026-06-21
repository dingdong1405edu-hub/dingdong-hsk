"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { matchesAccepted } from "@/lib/grammar";
import type { TypeSentenceExercise } from "@/types";

interface Props {
  exercise: TypeSentenceExercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function TypeSentenceExerciseUI({ exercise, onAnswer, disabled }: Props) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Chinese IME: Enter confirms a candidate while composing; only a non-composing
  // Enter submits the sentence (CLAUDE.md §13).
  const composingRef = useRef(false);

  function submit() {
    if (disabled || submitted || !value.trim()) return;
    setSubmitted(true);
    // Show the first accepted form as the reference answer in feedback.
    onAnswer(matchesAccepted(value, exercise.accept), exercise.accept[0]);
  }

  const locked = disabled || submitted;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">Tự gõ thành câu hoàn chỉnh</p>
        <div className="rounded-xl bg-muted/50 p-4">
          <p className="text-lg font-medium">{exercise.prompt}</p>
          {exercise.meaning && (
            <p className="mt-1 text-sm text-muted-foreground">{exercise.meaning}</p>
          )}
        </div>
        {exercise.hint && (
          <p className="text-sm italic text-muted-foreground">Gợi ý: {exercise.hint}</p>
        )}
      </div>

      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onCompositionStart={() => (composingRef.current = true)}
        onCompositionEnd={() => (composingRef.current = false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={locked}
        placeholder="Gõ câu tiếng Trung hoàn chỉnh…"
        lang="zh"
        rows={2}
        className="text-center font-chinese text-lg"
      />

      <Button className="w-full" disabled={!value.trim() || locked} onClick={submit}>
        Kiểm tra
      </Button>
    </div>
  );
}
