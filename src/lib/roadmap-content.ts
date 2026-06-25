// Nội dung RIÊNG của từng phần (section) trong một bài lộ trình, lưu ở
// RoadmapSection.content (Json). Mỗi kỹ năng có một shape khớp đúng với "player"
// có sẵn ở phần Luyện kỹ năng, nên người học chơi lại bằng chính trình chơi đó.
//
// File này dùng được ở CẢ server (validate khi lưu) lẫn client (editor) — chỉ
// phụ thuộc zod, KHÔNG import @prisma/client (chỉ dùng type SkillKey).
import { z } from "zod";
import type { SkillKey } from "@/lib/roadmap";

// ───────────────────────── Shared ─────────────────────────

const exampleSchema = z.object({
  hanzi: z.string().trim().min(1, "Ví dụ thiếu chữ Hán"),
  pinyin: z.string().trim().default(""),
  meaning: z.string().trim().default(""),
});
export type WordExample = z.infer<typeof exampleSchema>;

const questionTypeSchema = z.enum([
  "MCQ",
  "TRUE_FALSE",
  "FILL_BLANK",
  "SHORT_ANSWER",
  "MATCHING",
]);

const optionSchema = z.object({
  text: z.string(),
  pinyin: z.string().optional(),
  translation: z.string().optional(),
});

const correctAnswerSchema = z.object({
  index: z.number().int().optional(),
  value: z.boolean().optional(),
  text: z.string().optional(),
  accepted: z.array(z.string()).optional(),
});

// Câu hỏi dùng chung cho Đọc hiểu + Nghe hiểu (khớp ReadingQuestion/ListeningQuestion).
const questionSchema = z.object({
  type: questionTypeSchema,
  prompt: z.string().trim().min(1, "Câu hỏi thiếu đề"),
  promptPinyin: z.string().nullish(),
  promptTranslation: z.string().nullish(),
  options: z.array(optionSchema).optional(),
  correctAnswer: correctAnswerSchema,
  explanation: z.string().nullish(),
  supportingQuote: z.string().nullish(),
  quoteTranslation: z.string().nullish(),
});
export type RoadmapQuestion = z.infer<typeof questionSchema>;

// ───────────────────────── VOCAB (词汇) ─────────────────────────

const vocabWordSchema = z.object({
  hanzi: z.string().trim().min(1, "Thiếu chữ Hán"),
  pinyin: z.string().trim().min(1, "Thiếu pinyin"),
  meaning: z.string().trim().min(1, "Thiếu nghĩa tiếng Việt"),
  audioUrl: z.string().trim().nullish(),
  examples: z.array(exampleSchema).default([]),
});
export const vocabContentSchema = z.object({
  title: z.string().trim().optional(),
  words: z.array(vocabWordSchema).min(1, "Cần ít nhất 1 từ vựng"),
});
export type VocabSectionContent = z.infer<typeof vocabContentSchema>;

// ───────────────────────── HANZI (汉字) ─────────────────────────

const hanziCharSchema = z.object({
  character: z.string().trim().min(1, "Thiếu chữ Hán"),
  pinyin: z.string().trim().min(1, "Thiếu pinyin"),
  tone: z.coerce.number().int().min(0).max(4).default(0),
  meaning: z.string().trim().min(1, "Thiếu nghĩa tiếng Việt"),
  strokeCount: z.coerce.number().int().min(0).default(0),
  examples: z.array(exampleSchema).default([]),
});
export const hanziContentSchema = z.object({
  characters: z.array(hanziCharSchema).min(1, "Cần ít nhất 1 chữ Hán"),
});
export type HanziSectionContent = z.infer<typeof hanziContentSchema>;

// ───────────────────────── READING (阅读) ─────────────────────────
// hskLevel KHÔNG lưu ở đây — lấy từ Course cha khi dựng props cho player.

export const readingContentSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tiêu đề"),
  titleZh: z.string().trim().default(""),
  passage: z.string().trim().min(1, "Thiếu đoạn văn"),
  passagePinyin: z.string().nullish(),
  imageUrl: z.string().nullish(),
  timeLimit: z.coerce.number().int().min(0).default(600),
  questions: z.array(questionSchema).min(1, "Cần ít nhất 1 câu hỏi"),
});
export type ReadingSectionContent = z.infer<typeof readingContentSchema>;

// ───────────────────────── LISTENING (听力) ─────────────────────────

export const listeningContentSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tiêu đề"),
  audioUrl: z.string().trim().default(""),
  transcript: z.string().nullish(),
  transcriptExplanation: z.string().nullish(),
  imageUrl: z.string().nullish(),
  timeLimit: z.coerce.number().int().min(0).default(180),
  questions: z.array(questionSchema).min(1, "Cần ít nhất 1 câu hỏi"),
});
export type ListeningSectionContent = z.infer<typeof listeningContentSchema>;

// ───────────────────────── WRITING (写作) ─────────────────────────

export const writingContentSchema = z.object({
  taskType: z.enum(["FREE", "GUIDED", "PICTURE_DESCRIPTION"]).default("FREE"),
  prompt: z.string().trim().min(1, "Thiếu đề bài"),
  promptZh: z.string().nullish(),
  outline: z.string().nullish(),
  imageUrl: z.string().nullish(),
  minChars: z.coerce.number().int().min(0).default(50),
  timeLimit: z.coerce.number().int().min(0).default(900),
});
export type WritingSectionContent = z.infer<typeof writingContentSchema>;

// ───────────────────────── SPEAKING (口语 — HSKK) ─────────────────────────

const sentenceSchema = z.object({
  text: z.string().trim().min(1),
  pinyin: z.string().trim().default(""),
});
const passageSchema = z.object({
  text: z.string().trim().min(1),
  pinyin: z.string().trim().default(""),
});
const questionItemSchema = z.object({
  question: z.string().trim().min(1),
  pinyin: z.string().trim().default(""),
});
export const speakingContentSchema = z
  .object({
    part1Sentences: z.array(sentenceSchema).default([]),
    part2Passage: passageSchema.nullish(),
    part3Questions: z.array(questionItemSchema).default([]),
  })
  .refine(
    (c) =>
      (c.part1Sentences?.length ?? 0) > 0 ||
      (c.part3Questions?.length ?? 0) > 0 ||
      !!c.part2Passage?.text,
    "Cần ít nhất một phần nội dung (lặp câu / đoạn văn / câu hỏi)"
  );
export type SpeakingSectionContent = z.infer<typeof speakingContentSchema>;

// ───────────────────────── GRAMMAR (语法) ─────────────────────────
// Shape v3 phức tạp (Exercise union) được parseGrammarContent() chuẩn hoá khi
// chơi; ở đây chỉ kiểm tra cấu trúc tối thiểu.

export const grammarContentSchema = z
  .object({
    version: z.number().optional(),
    sections: z
      .array(
        z
          .object({
            title: z.string().trim().min(1, "Phần lý thuyết thiếu tiêu đề"),
            explanation: z.string().trim().min(1, "Phần lý thuyết thiếu giải thích"),
          })
          .passthrough()
      )
      .min(1, "Cần ít nhất 1 phần lý thuyết"),
    test: z.unknown().optional(),
  })
  .passthrough();
export type GrammarSectionContent = z.infer<typeof grammarContentSchema>;

// ───────────────────────── Registry + validate ─────────────────────────

const SCHEMA_BY_SKILL: Record<SkillKey, z.ZodTypeAny> = {
  VOCAB: vocabContentSchema,
  GRAMMAR: grammarContentSchema,
  HANZI: hanziContentSchema,
  READING: readingContentSchema,
  LISTENING: listeningContentSchema,
  WRITING: writingContentSchema,
  SPEAKING: speakingContentSchema,
};

export type SectionValidation =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

/** Validate (và chuẩn hoá) content của một section theo kỹ năng. */
export function validateSectionContent(skill: SkillKey, content: unknown): SectionValidation {
  const schema = SCHEMA_BY_SKILL[skill];
  if (!schema) return { ok: false, error: `Kỹ năng không hợp lệ: ${skill}` };
  const parsed = schema.safeParse(content);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nội dung không hợp lệ" };
  }
  return { ok: true, data: parsed.data };
}

/**
 * Id ổn định cho câu hỏi thứ i (0-based) của Đọc/Nghe trong lộ trình. Player và
 * action chấm điểm PHẢI dùng cùng hàm này để khớp khoá `answers`.
 */
export function roadmapQuestionId(i: number): string {
  return `q${i + 1}`;
}

/** Mẫu content khởi tạo cho editor mỗi kỹ năng. */
export function emptyContentFor(skill: SkillKey): unknown {
  switch (skill) {
    case "VOCAB":
      return { words: [] };
    case "HANZI":
      return { characters: [] };
    case "GRAMMAR":
      return { version: 3, sections: [], test: { questions: [] } };
    case "READING":
      return { title: "", titleZh: "", passage: "", timeLimit: 600, questions: [] };
    case "LISTENING":
      return { title: "", audioUrl: "", timeLimit: 180, questions: [] };
    case "WRITING":
      return { taskType: "FREE", prompt: "", minChars: 50, timeLimit: 900 };
    case "SPEAKING":
      return { part1Sentences: [], part2Passage: { text: "", pinyin: "" }, part3Questions: [] };
    default:
      return {};
  }
}
