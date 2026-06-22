// Grammar lesson content lives in `GrammarLesson.exercises` (JSON). It can be:
//   - v3: { version:3, sections:[{ ...theory, exercises }], test } — current,
//   - v2: { theory, flashcards, test }                            — earlier, or
//   - a bare Exercise[] array                                     — legacy.
// This module is the single tolerant boundary that normalises any of those into
// a v3 content object, plus the deterministic grading helpers for the
// free-typed exercises.
import type {
  Exercise,
  GrammarLessonContent,
  GrammarSection,
  GrammarTest,
  SituationalExample,
} from "@/types";

const DEFAULT_PASS_THRESHOLD = 60;

const EMPTY: GrammarLessonContent = {
  version: 3,
  sections: [],
  test: { questions: [], passThreshold: DEFAULT_PASS_THRESHOLD },
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function optStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}
function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Coerce one section to the type contract — crucially guaranteeing `examples`
 *  and `exercises` are always arrays so the UI can map over them safely. */
function normalizeSection(raw: unknown): GrammarSection {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: str(s.id),
    title: str(s.title),
    titleZh: optStr(s.titleZh),
    structure: optStr(s.structure),
    explanation: str(s.explanation),
    imageUrl: optStr(s.imageUrl),
    examples: arr<SituationalExample>(s.examples),
    exercises: arr<Exercise>(s.exercises),
  };
}

function normalizeTest(raw: unknown): GrammarTest {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    questions: arr<Exercise>(t.questions),
    passThreshold:
      typeof t.passThreshold === "number" ? t.passThreshold : DEFAULT_PASS_THRESHOLD,
    timeLimit: typeof t.timeLimit === "number" ? t.timeLimit : undefined,
  };
}

/**
 * Tolerant deserialiser → always returns a v3 content object.
 *  - bare array  → one practice-only section.
 *  - v3 object   → normalised sections + test.
 *  - v2 object   → theory sections, with all flashcards appended to the last
 *                  section's practice (or a synthetic practice section).
 */
export function parseGrammarContent(raw: unknown): GrammarLessonContent {
  if (Array.isArray(raw)) {
    return {
      version: 3,
      sections: raw.length
        ? [{ id: "", title: "Luyện tập", explanation: "", examples: [], exercises: raw as Exercise[] }]
        : [],
      test: { questions: [], passThreshold: DEFAULT_PASS_THRESHOLD },
    };
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;

    // v3 — the canonical shape.
    if (Array.isArray(obj.sections)) {
      return {
        version: 3,
        sections: obj.sections.map(normalizeSection),
        test: normalizeTest(obj.test),
      };
    }

    // v2 back-compat — { theory, flashcards, test }.
    if (Array.isArray(obj.theory) || Array.isArray(obj.flashcards)) {
      const theory = arr<unknown>(obj.theory).map(normalizeSection);
      const flashcards = arr<Exercise>(obj.flashcards);
      let sections: GrammarSection[];
      if (theory.length > 0) {
        // Attach legacy flashcards to the last theory section so they still drill.
        sections = theory.map((s, i) =>
          i === theory.length - 1 ? { ...s, exercises: [...s.exercises, ...flashcards] } : s
        );
      } else if (flashcards.length > 0) {
        sections = [
          { id: "", title: "Luyện tập", explanation: "", examples: [], exercises: flashcards },
        ];
      } else {
        sections = [];
      }
      return { version: 3, sections, test: normalizeTest(obj.test) };
    }

    return EMPTY;
  }

  return EMPTY;
}

/**
 * Count of interactive items in a grammar lesson (all section exercises + test
 * questions), used for the "{n} bài tập" labels. Operates on raw DB JSON.
 */
export function grammarItemCount(raw: unknown): number {
  const c = parseGrammarContent(raw);
  return c.sections.reduce((n, s) => n + s.exercises.length, 0) + c.test.questions.length;
}

/** Số câu hỏi trong bài kiểm tra của một bài ngữ pháp (đọc raw DB JSON). */
export function grammarTestCount(raw: unknown): number {
  return parseGrammarContent(raw).test.questions.length;
}

/**
 * Flatten one grammar lesson's raw JSON into a single list of practice items —
 * every section's exercises plus the comprehensive test's questions. Used by the
 * "Ôn ngữ pháp" review mode, which mixes the items of many lessons into one
 * risk-free session. Operates on raw DB JSON (tolerant via parseGrammarContent).
 */
export function grammarReviewExercises(raw: unknown): Exercise[] {
  const c = parseGrammarContent(raw);
  return [...c.sections.flatMap((s) => s.exercises), ...c.test.questions];
}

/** Vietnamese label for each exercise type — shared by the review breakdown and
 *  the printable PDF. */
export const EXERCISE_TYPE_LABEL: Record<string, string> = {
  match: "Nối từ",
  translate: "Dịch câu",
  toneSelect: "Chọn thanh điệu",
  sentenceOrder: "Sắp xếp câu",
  sentence_order: "Sắp xếp câu",
  pinyinMatch: "Nối pinyin",
  fill_blank: "Điền chỗ trống",
  answer_question: "Trả lời câu hỏi",
  type_sentence: "Viết câu",
};

/** A flattened, printable view of one exercise: the question, any options, the
 *  correct answer and the author explanation — everything the PDF needs. */
export interface PdfExercise {
  typeLabel: string;
  question: string;
  questionPinyin?: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

/** Reduce any exercise to the fields the printable answer key shows. Tolerant of
 *  the loose Exercise shape (reads via the index signature). */
export function describeExercise(ex: Exercise): PdfExercise {
  const e = ex as Record<string, unknown>;
  const type = String(ex.type);
  const label = EXERCISE_TYPE_LABEL[type] ?? type;
  const explanation = typeof ex.explanation === "string" ? ex.explanation : undefined;
  const s = (k: string) => (typeof e[k] === "string" ? (e[k] as string) : undefined);
  const list = (k: string) => (Array.isArray(e[k]) ? (e[k] as unknown[]).map((x) => String(x)) : undefined);

  switch (type) {
    case "fill_blank":
      return { typeLabel: label, question: s("sentence") ?? "", options: list("options"), answer: s("blank") ?? "", explanation };
    case "sentence_order":
    case "sentenceOrder":
      return { typeLabel: label, question: (list("words") ?? []).join("  /  "), answer: s("answer") ?? "", explanation };
    case "translate":
      return { typeLabel: label, question: s("prompt") ?? "", options: list("options"), answer: s("answer") ?? "", explanation };
    case "answer_question": {
      const accept = list("accept");
      return { typeLabel: label, question: s("question") ?? "", questionPinyin: s("questionPinyin"), answer: s("sampleAnswer") ?? accept?.[0] ?? "", explanation };
    }
    case "type_sentence":
      return { typeLabel: label, question: s("prompt") ?? "", answer: list("accept")?.[0] ?? "", explanation };
    case "toneSelect": {
      const options = list("options");
      const correct = typeof e.correct === "number" ? (e.correct as number) : 0;
      return { typeLabel: label, question: `${s("question") ?? ""} (${s("word") ?? ""})`.trim(), options, answer: options?.[correct] ?? "", explanation };
    }
    case "match": {
      const pairs = Array.isArray(e.pairs) ? (e.pairs as Array<Record<string, unknown>>) : [];
      return { typeLabel: label, question: "Nối từ với nghĩa tương ứng", answer: pairs.map((p) => `${p.zh} = ${p.vi}`).join(" · "), explanation };
    }
    case "pinyinMatch": {
      const pairs = Array.isArray(e.pairs) ? (e.pairs as Array<Record<string, unknown>>) : [];
      return { typeLabel: label, question: "Nối Hán tự với pinyin", answer: pairs.map((p) => `${p.zh} = ${p.pinyin}`).join(" · "), explanation };
    }
    default:
      return {
        typeLabel: label,
        question: s("prompt") ?? s("question") ?? s("sentence") ?? "",
        answer: s("answer") ?? s("blank") ?? "",
        explanation,
      };
  }
}

/**
 * Normalise a free-typed answer for deterministic comparison: trim, lowercase
 * (for Latin / pinyin), drop all whitespace, and strip common CN + Latin
 * punctuation so "他是老师。" matches "他是老师".
 */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[。，、．！？；：“”‘’（）【】「」《》〈〉()[\]{}.,!?;:"'`~·…—-]/g, "");
}

/** Whether a typed answer matches any accepted variant (after normalisation). */
export function matchesAccepted(input: string, accept: string[]): boolean {
  const norm = normalizeAnswer(input);
  if (!norm) return false;
  return accept.some((a) => normalizeAnswer(a) === norm);
}
