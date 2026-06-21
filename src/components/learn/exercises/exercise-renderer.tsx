"use client";
// Single switch that maps any Exercise to its UI. Shared by the grammar
// flashcard phase and the comprehensive test runner so both stay in sync as
// new exercise types are added. Every UI honours the same
// `{ exercise, onAnswer, disabled }` contract.
import { MatchExerciseUI } from "./match-exercise";
import { TranslateExerciseUI } from "./translate-exercise";
import { ToneSelectExerciseUI } from "./tone-select-exercise";
import { SentenceOrderExerciseUI } from "./sentence-order-exercise";
import { PinyinMatchExerciseUI } from "./pinyin-match-exercise";
import { FillBlankExerciseUI } from "./fill-blank-exercise";
import { AnswerQuestionExerciseUI } from "./answer-question-exercise";
import { TypeSentenceExerciseUI } from "./type-sentence-exercise";
import type { Exercise } from "@/types";

interface Props {
  exercise: Exercise;
  onAnswer: (correct: boolean, answer?: string) => void;
  disabled: boolean;
}

export function ExerciseRenderer({ exercise, onAnswer, disabled }: Props) {
  const common = { onAnswer, disabled } as const;
  switch (exercise.type) {
    case "match":
      return <MatchExerciseUI exercise={exercise as never} {...common} />;
    case "translate":
      return <TranslateExerciseUI exercise={exercise as never} {...common} />;
    case "toneSelect":
      return <ToneSelectExerciseUI exercise={exercise as never} {...common} />;
    case "sentenceOrder":
    case "sentence_order":
      return <SentenceOrderExerciseUI exercise={exercise as never} {...common} />;
    case "pinyinMatch":
      return <PinyinMatchExerciseUI exercise={exercise as never} {...common} />;
    case "fill_blank":
      return <FillBlankExerciseUI exercise={exercise as never} {...common} />;
    case "answer_question":
      return <AnswerQuestionExerciseUI exercise={exercise as never} {...common} />;
    case "type_sentence":
      return <TypeSentenceExerciseUI exercise={exercise as never} {...common} />;
    default:
      return (
        <div className="text-center text-sm text-muted-foreground">
          Loại bài tập không hỗ trợ: {String(exercise.type)}
        </div>
      );
  }
}
