import type { HSKLevel, QuestionType } from "@prisma/client";

export interface ReadingOption {
  text: string;
  pinyin?: string;
}

export interface ReadingQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptPinyin?: string | null;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  /** Câu/đoạn trích trong bài chứng minh đáp án (Groq sinh khi admin thêm câu hỏi). */
  supportingQuote?: string | null;
  order: number;
}

export interface ReadingTestData {
  id: string;
  title: string;
  titleZh: string;
  hskLevel: HSKLevel;
  passage: string;
  passagePinyin?: string | null;
  imageUrl?: string | null;
  timeLimit: number;
  questions: ReadingQuestion[];
}

export type ReadingTheme = "paper" | "white" | "soft" | "night";

export interface ReadingSettings {
  /** px */
  fontSize: number;
  /** unitless line-height */
  leading: number;
  theme: ReadingTheme;
}

export const FONT_SIZES = [
  { label: "S", value: 15 },
  { label: "M", value: 17 },
  { label: "L", value: 20 },
  { label: "XL", value: 23 },
];

export const LEADINGS = [
  { label: "Hẹp", value: 1.6 },
  { label: "Vừa", value: 1.95 },
  { label: "Rộng", value: 2.4 },
];

export const THEMES: { label: string; value: ReadingTheme }[] = [
  { label: "Giấy", value: "paper" },
  { label: "Trắng", value: "white" },
  { label: "Xám", value: "soft" },
  { label: "Tối", value: "night" },
];
