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

/**
 * Chuyển danh sách câu hỏi ở "định dạng tác giả" (dễ gõ tay / AI sinh: dùng
 * `answer` thay cho `correctAnswer`) → RoadmapQuestion[]. Bỏ qua mục không hợp lệ.
 * Dùng chung cho: ô nhập JSON câu hỏi, editor dán JSON cả phần, và nhập bài hàng loạt.
 */
export function authoringToRoadmapQuestions(arr: unknown): RoadmapQuestion[] {
  if (!Array.isArray(arr)) throw new Error("Danh sách câu hỏi phải là một mảng [].");
  const out: RoadmapQuestion[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    // Đã ở dạng RoadmapQuestion (có correctAnswer) → giữ nguyên (sau khi lọc tối thiểu).
    if (r.correctAnswer && typeof r.correctAnswer === "object") {
      const parsed = questionSchema.safeParse(r);
      if (parsed.success) out.push(parsed.data);
      continue;
    }
    const type = String(r.type ?? "").toUpperCase();
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!prompt) continue;
    const base = {
      prompt,
      promptPinyin: typeof r.promptPinyin === "string" ? r.promptPinyin : undefined,
      promptTranslation: typeof r.promptTranslation === "string" ? r.promptTranslation : undefined,
      explanation: typeof r.explanation === "string" ? r.explanation : undefined,
      supportingQuote: typeof r.supportingQuote === "string" ? r.supportingQuote : undefined,
      quoteTranslation: typeof r.quoteTranslation === "string" ? r.quoteTranslation : undefined,
    };
    if (type === "MCQ") {
      const opts = Array.isArray(r.options) ? r.options.map((o) => String(o)) : [];
      if (opts.length < 2) continue;
      const tr = Array.isArray(r.optionsTranslation) ? r.optionsTranslation.map((o) => String(o)) : [];
      const answer = typeof r.answer === "number" ? r.answer : 0;
      out.push({
        ...base,
        type: "MCQ",
        options: opts.map((t, i) => ({ text: t, ...(tr[i] ? { translation: tr[i] } : {}) })),
        correctAnswer: { index: Math.max(0, Math.min(opts.length - 1, answer)) },
      });
    } else if (type === "TRUE_FALSE") {
      out.push({ ...base, type: "TRUE_FALSE", correctAnswer: { value: r.answer === true || r.answer === "true" } });
    } else if (type === "FILL_BLANK" || type === "SHORT_ANSWER") {
      out.push({
        ...base,
        type: "FILL_BLANK",
        correctAnswer: {
          text: typeof r.answer === "string" ? r.answer : "",
          accepted: Array.isArray(r.accepted) ? r.accepted.map((a) => String(a)) : [],
        },
      });
    }
  }
  return out;
}

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
//
// MỚI: một phần Đọc có thể chứa NHIỀU đoạn văn (passages), mỗi đoạn có câu hỏi
// riêng. Học viên làm lần lượt từng đoạn rồi chấm chung. Shape cũ một-đoạn
// ({ passage, questions }) vẫn đọc được nhờ `normalizeReadingContent` gói lại
// thành `passages: [ … ]` trước khi validate (tương thích ngược 100%).

const readingPassageSchema = z.object({
  passage: z.string().trim().min(1, "Thiếu đoạn văn"),
  passagePinyin: z.string().nullish(),
  imageUrl: z.string().nullish(),
  titleZh: z.string().trim().optional(),
  questions: z.array(questionSchema).min(1, "Cần ít nhất 1 câu hỏi"),
});
export type ReadingPassageContent = z.infer<typeof readingPassageSchema>;

/** Gói nội dung Đọc (cũ một-đoạn hoặc mới nhiều-đoạn) về dạng chuẩn `passages[]`. */
export function normalizeReadingContent(raw: unknown): {
  title: string;
  titleZh: string;
  timeLimit: number;
  passages: Array<{
    passage: string;
    passagePinyin?: string | null;
    imageUrl?: string | null;
    titleZh?: string;
    questions: RoadmapQuestion[];
  }>;
} {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const toPassage = (r: unknown) => {
    const p = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
    return {
      passage: typeof p.passage === "string" ? p.passage : "",
      passagePinyin: typeof p.passagePinyin === "string" ? p.passagePinyin : null,
      imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
      titleZh: typeof p.titleZh === "string" ? p.titleZh : undefined,
      questions: Array.isArray(p.questions) ? (p.questions as RoadmapQuestion[]) : [],
    };
  };
  let passages: ReturnType<typeof toPassage>[];
  if (Array.isArray(o.passages)) {
    passages = (o.passages as unknown[]).map(toPassage);
  } else if (typeof o.passage === "string" || Array.isArray(o.questions)) {
    passages = [toPassage(o)]; // shape cũ một-đoạn
  } else {
    passages = [];
  }
  return {
    title: typeof o.title === "string" ? o.title : "",
    titleZh: typeof o.titleZh === "string" ? o.titleZh : "",
    timeLimit:
      typeof o.timeLimit === "number" ? o.timeLimit : Number(o.timeLimit) || 600,
    passages,
  };
}

export const readingContentSchema = z.preprocess(
  (raw) => normalizeReadingContent(raw),
  z.object({
    title: z.string().trim().min(1, "Thiếu tiêu đề"),
    titleZh: z.string().trim().default(""),
    timeLimit: z.coerce.number().int().min(0).default(600),
    passages: z.array(readingPassageSchema).min(1, "Cần ít nhất 1 đoạn đọc"),
  })
);
export type ReadingSectionContent = z.infer<typeof readingContentSchema>;

// ───────────────────────── LISTENING (听力) ─────────────────────────
// MỚI: một phần Nghe có thể chứa NHIỀU đoạn nghe (clips), mỗi đoạn có audio +
// lời thoại + câu hỏi riêng. Shape cũ một-đoạn vẫn đọc được nhờ
// `normalizeListeningContent`.

const listeningClipSchema = z.object({
  title: z.string().trim().optional(),
  audioUrl: z.string().trim().default(""),
  transcript: z.string().nullish(),
  transcriptExplanation: z.string().nullish(),
  imageUrl: z.string().nullish(),
  questions: z.array(questionSchema).min(1, "Cần ít nhất 1 câu hỏi"),
});
export type ListeningClipContent = z.infer<typeof listeningClipSchema>;

/** Gói nội dung Nghe (cũ một-đoạn hoặc mới nhiều-đoạn) về dạng chuẩn `clips[]`. */
export function normalizeListeningContent(raw: unknown): {
  title: string;
  timeLimit: number;
  clips: Array<{
    title?: string;
    audioUrl: string;
    transcript?: string | null;
    transcriptExplanation?: string | null;
    imageUrl?: string | null;
    questions: RoadmapQuestion[];
  }>;
} {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const toClip = (r: unknown) => {
    const c = r && typeof r === "object" ? (r as Record<string, unknown>) : {};
    return {
      title: typeof c.title === "string" ? c.title : undefined,
      audioUrl: typeof c.audioUrl === "string" ? c.audioUrl : "",
      transcript: typeof c.transcript === "string" ? c.transcript : null,
      transcriptExplanation:
        typeof c.transcriptExplanation === "string" ? c.transcriptExplanation : null,
      imageUrl: typeof c.imageUrl === "string" ? c.imageUrl : null,
      questions: Array.isArray(c.questions) ? (c.questions as RoadmapQuestion[]) : [],
    };
  };
  let clips: ReturnType<typeof toClip>[];
  if (Array.isArray(o.clips)) {
    clips = (o.clips as unknown[]).map(toClip);
  } else if (
    typeof o.audioUrl === "string" ||
    typeof o.transcript === "string" ||
    Array.isArray(o.questions)
  ) {
    clips = [toClip(o)]; // shape cũ một-đoạn
  } else {
    clips = [];
  }
  return {
    title: typeof o.title === "string" ? o.title : "",
    timeLimit:
      typeof o.timeLimit === "number" ? o.timeLimit : Number(o.timeLimit) || 180,
    clips,
  };
}

export const listeningContentSchema = z.preprocess(
  (raw) => normalizeListeningContent(raw),
  z.object({
    title: z.string().trim().min(1, "Thiếu tiêu đề"),
    timeLimit: z.coerce.number().int().min(0).default(180),
    clips: z.array(listeningClipSchema).min(1, "Cần ít nhất 1 đoạn nghe"),
  })
);
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
      return {
        title: "",
        titleZh: "",
        timeLimit: 600,
        passages: [{ passage: "", questions: [] }],
      };
    case "LISTENING":
      return {
        title: "",
        timeLimit: 180,
        clips: [{ audioUrl: "", transcript: "", questions: [] }],
      };
    case "WRITING":
      return { taskType: "FREE", prompt: "", minChars: 50, timeLimit: 900 };
    case "SPEAKING":
      return { part1Sentences: [], part2Passage: { text: "", pinyin: "" }, part3Questions: [] };
    default:
      return {};
  }
}
