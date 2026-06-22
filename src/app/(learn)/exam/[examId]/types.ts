import type { HSKLevel, QuestionType, Skill } from "@prisma/client";

// Cấu trúc đề thi thử nạp cho runner (sections → parts → questions).
export interface ExamQuestionData {
  id: string;
  type: QuestionType;
  prompt: string;
  promptPinyin: string | null;
  options: unknown;
  correctAnswer: unknown;
  explanation: string | null;
  supportingQuote: string | null;
  order: number;
}

export interface ExamPartData {
  id: string;
  title: string;
  instructions: string | null;
  imageUrl: string | null;
  passage: string | null;
  passagePinyin: string | null;
  audioUrl: string | null;
  transcript: string | null;
  writingPrompt: string | null;
  writingMinChars: number | null;
  questions: ExamQuestionData[];
}

export interface ExamSectionData {
  id: string;
  skill: Skill;
  title: string;
  instructions: string | null;
  parts: ExamPartData[];
}

export interface ExamData {
  id: string;
  title: string;
  titleZh: string | null;
  hskLevel: HSKLevel;
  description: string | null;
  totalTime: number | null; // giây
  sections: ExamSectionData[];
}
