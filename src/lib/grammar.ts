// Grammar lesson content lives in `GrammarLesson.exercises` (JSON). It can be
// the structured object (theory → flashcards → test) or, for lessons authored
// before this feature, a bare `Exercise[]` array. This module is the single
// tolerant boundary that turns either shape into a normalised content object,
// plus the deterministic grading helpers for the free-typed exercises.
import type {
  Exercise,
  GrammarLessonContent,
  SituationalExample,
  TheorySection,
} from "@/types";

const DEFAULT_PASS_THRESHOLD = 60;

/** Coerce one theory section to the type contract — crucially guaranteeing
 *  `examples` is always an array so the viewer can read `.length`/`.map` safely
 *  regardless of how the content was authored or migrated. */
function normalizeTheorySection(raw: unknown): TheorySection {
  const sec = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof sec.id === "string" ? sec.id : "",
    title: typeof sec.title === "string" ? sec.title : "",
    titleZh: typeof sec.titleZh === "string" ? sec.titleZh : undefined,
    structure: typeof sec.structure === "string" ? sec.structure : undefined,
    explanation: typeof sec.explanation === "string" ? sec.explanation : "",
    examples: Array.isArray(sec.examples) ? (sec.examples as SituationalExample[]) : [],
  };
}

const EMPTY: GrammarLessonContent = {
  version: 2,
  theory: [],
  flashcards: [],
  test: { questions: [], passThreshold: DEFAULT_PASS_THRESHOLD },
};

/**
 * Tolerant deserialiser. Accepts:
 *  - the structured `{ version, theory, flashcards, test }` object, or
 *  - a legacy bare `Exercise[]` array → treated as flashcards-only.
 * Every section is defensively normalised so a malformed field never throws at
 * render time.
 */
export function parseGrammarContent(raw: unknown): GrammarLessonContent {
  if (Array.isArray(raw)) {
    return { ...EMPTY, flashcards: raw as Exercise[] };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const theory = Array.isArray(obj.theory) ? obj.theory.map(normalizeTheorySection) : [];
    const flashcards = Array.isArray(obj.flashcards) ? (obj.flashcards as Exercise[]) : [];
    const testObj =
      obj.test && typeof obj.test === "object" ? (obj.test as Record<string, unknown>) : {};
    const questions = Array.isArray(testObj.questions) ? (testObj.questions as Exercise[]) : [];
    const passThreshold =
      typeof testObj.passThreshold === "number" ? testObj.passThreshold : DEFAULT_PASS_THRESHOLD;
    const timeLimit = typeof testObj.timeLimit === "number" ? testObj.timeLimit : undefined;
    return { version: 2, theory, flashcards, test: { questions, passThreshold, timeLimit } };
  }
  return EMPTY;
}

/**
 * Count of interactive items in a grammar lesson (flashcards + test questions),
 * used for the "{n} bài tập" labels on unit/admin pages. Operates on the raw DB
 * JSON so callers don't need to deserialise first.
 */
export function grammarItemCount(raw: unknown): number {
  const c = parseGrammarContent(raw);
  return c.flashcards.length + c.test.questions.length;
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
