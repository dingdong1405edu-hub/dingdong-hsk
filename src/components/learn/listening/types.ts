import type { HSKLevel, QuestionType } from "@prisma/client";

export interface ListeningOption {
  text: string;
  pinyin?: string;
  /** Bản dịch tiếng Việt của lựa chọn (hiện khi chữa bài). */
  translation?: string;
}

export interface ListeningQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  promptPinyin?: string | null;
  /** Bản dịch tiếng Việt của câu hỏi (hiện khi chữa bài). */
  promptTranslation?: string | null;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  /** Câu/đoạn trích chứng minh đáp án. */
  supportingQuote?: string | null;
  /** Bản dịch tiếng Việt của câu trích dẫn. */
  quoteTranslation?: string | null;
  order: number;
}

export interface ListeningTestData {
  id: string;
  title: string;
  hskLevel: HSKLevel;
  audioUrl: string;
  transcript?: string | null;
  /** Bản dịch + giải thích lời thoại (tiếng Việt) — hiện khi chữa bài. */
  transcriptExplanation?: string | null;
  imageUrl?: string | null;
  timeLimit: number;
  questions: ListeningQuestion[];
}
