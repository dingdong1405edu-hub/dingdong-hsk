export type { HSKLevel, Role, Skill, QuestionType, WritingTaskType } from "@prisma/client";

export interface Exercise {
  type:
    | "match"
    | "translate"
    | "toneSelect"
    | "hanziInput"
    | "sentenceOrder"
    | "pinyinMatch"
    | "fill_blank"
    | "sentence_order"
    | "answer_question"
    | "type_sentence";
  /** Optional author-written rationale shown when the learner answers wrong —
   *  explains WHY the answer is what it is, not just the correct answer. */
  explanation?: string;
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

/** Free-typed short answer to a question. Graded by matching the normalised
 *  input against any entry in `accept` (deterministic, offline). */
export interface AnswerQuestionExercise extends Exercise {
  type: "answer_question";
  question: string;
  questionPinyin?: string;
  accept: string[];
  sampleAnswer: string;
  hint?: string;
}

/** Free-typed full sentence (e.g. translate a Vietnamese prompt into Chinese).
 *  Graded by matching the normalised input against any entry in `accept`. */
export interface TypeSentenceExercise extends Exercise {
  type: "type_sentence";
  prompt: string;
  accept: string[];
  pinyin?: string;
  meaning?: string;
  hint?: string;
}

// ===== Grammar lesson content (per-section: theory + practice → final test) =====

/** A concrete situational example illustrating one grammar point. */
export interface SituationalExample {
  situation: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  note?: string;
  /** Optional illustration for this context (URL or hosted path). */
  imageUrl?: string;
}

/** One labelled component of a grammar formula. Glosses a single slot/word of
 *  the `structure` so a beginner sees what EVERY part means — not just the bare
 *  formula. Listed in formula order; the viewer colours each part + its card. */
export interface FormulaPart {
  /** The slot or word exactly as it appears in the formula (e.g. "A", "是", "B"). */
  part: string;
  /** Pinyin for a literal Chinese token (optional — omit for placeholders A/B). */
  pinyin?: string;
  /** Short grammatical role, e.g. "Chủ ngữ", "Động từ 'là'", "Danh từ". */
  role?: string;
  /** Plain-Vietnamese meaning — what this part does in the sentence. */
  meaning: string;
}

/** A common learner mistake for a grammar point: the wrong form, the corrected
 *  form, and an optional one-line reason. Rendered as a ❌ sai / ✔ đúng row. */
export interface GrammarMistake {
  wrong: string;
  right: string;
  note?: string;
}

/** The theory (display) fields of one grammar section: a framed formula with an
 *  optional per-part breakdown, a "when to use" note, the explanation, common
 *  mistakes, an optional image and the situational examples. */
export interface TheorySection {
  id: string;
  title: string;
  titleZh?: string;
  structure?: string;
  /** Per-part gloss of the formula, in formula order. When present the viewer
   *  shows an annotated card for each part; when absent it just colours the
   *  formula tokens. Optional + backward compatible. */
  breakdown?: FormulaPart[];
  explanation: string;
  /** When/why to use this structure — its own "Khi nào dùng" callout. */
  usage?: string;
  /** Common mistakes, shown as ❌ sai / ✔ đúng rows. */
  mistakes?: GrammarMistake[];
  /** Optional illustration for the whole section (URL or hosted path). */
  imageUrl?: string;
  examples: SituationalExample[];
}

/** One "small part" of a grammar lesson: the theory above PLUS the practice
 *  exercises for that exact part — the learner studies it then drills it
 *  immediately, before moving to the next section. */
export interface GrammarSection extends TheorySection {
  exercises: Exercise[];
}

/** The comprehensive end-of-lesson test (standard grammar-exam format): graded
 *  as a block, optional countdown, pass at `passThreshold`% (default 60). */
export interface GrammarTest {
  timeLimit?: number;
  passThreshold?: number;
  questions: Exercise[];
}

/** Structured `GrammarLesson.exercises` JSON (version 3): an ordered list of
 *  sections (each = theory + its practice) followed by one comprehensive test.
 *  The deserialiser also accepts a legacy bare `Exercise[]` array and the
 *  earlier `{ theory, flashcards, test }` (v2) shape. */
export interface GrammarLessonContent {
  version: 3;
  sections: GrammarSection[];
  test: GrammarTest;
}

/** One example sentence attached to a vocabulary word. */
export interface WordExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

/** A vocabulary word as consumed by the learner per-word flow (serialised from
 *  the VocabWord model — `examples` parsed, `audioUrl` nullable). */
export interface VocabWordCard {
  id: string;
  lessonId: string;
  order: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  examples: WordExample[];
  audioUrl: string | null;
}

/** Trạng thái lặp lại ngắt quãng của một từ, đã serialise cho client (chế độ
 *  "Ôn từ"). `dueAt` = ISO string thời điểm đến hạn, null = từ mới (chưa từng ôn).
 *  `repetitions` dùng để phân biệt từ mới (0 → ưu tiên flashcard) với từ đã thuộc
 *  (>0 → kiểm tra bằng mini-game). */
export interface WordReviewState {
  wordId: string;
  dueAt: string | null;
  repetitions: number;
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
