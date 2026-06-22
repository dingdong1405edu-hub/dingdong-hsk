import type { HSKLevel, QuestionType } from "@prisma/client";

export interface ListeningOption {
  text: string;
  pinyin?: string;
}

export interface ListeningQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptPinyin?: string | null;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  order: number;
}

export interface ListeningTestData {
  id: string;
  title: string;
  hskLevel: HSKLevel;
  audioUrl: string;
  transcript?: string | null;
  imageUrl?: string | null;
  timeLimit: number;
  questions: ListeningQuestion[];
}
