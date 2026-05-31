export type { HSKLevel, Role, Skill, QuestionType, WritingTaskType } from "@prisma/client";

export interface Exercise {
  type: "match" | "translate" | "toneSelect" | "hanziInput" | "sentenceOrder" | "pinyinMatch" | "fill_blank" | "sentence_order";
  [key: string]: unknown;
}

export interface MatchExercise extends Exercise {
  type: "match";
  pairs: Array<{ zh: string; vi: string; pinyin: string }>;
}

export interface TranslateExercise extends Exercise {
  type: "translate";
  direction: "zh_to_vi" | "vi_to_zh";
  prompt: string;
  answer: string;
  pinyin?: string;
  options: string[];
}

export interface ToneSelectExercise extends Exercise {
  type: "toneSelect";
  word: string;
  pinyin: string;
  question: string;
  options: string[];
  correct: number;
}

export interface SentenceOrderExercise extends Exercise {
  type: "sentenceOrder" | "sentence_order";
  words: string[];
  answer: string;
  hint?: string;
  meaning?: string;
}

export interface PinyinMatchExercise extends Exercise {
  type: "pinyinMatch";
  pairs: Array<{ zh: string; pinyin: string }>;
}

export interface FillBlankExercise extends Exercise {
  type: "fill_blank";
  sentence: string;
  blank: string;
  options: string[];
  hint?: string;
}

export interface QuestionOption {
  text: string;
  pinyin?: string;
}

export interface MCQAnswer {
  index: number;
  text: string;
}

export interface TrueFalseAnswer {
  value: boolean;
}

export interface LessonResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  xpEarned: number;
  heartsLost: number;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }
  interface User {
    role?: string;
  }
}
