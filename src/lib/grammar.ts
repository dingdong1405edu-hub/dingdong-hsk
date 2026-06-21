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
