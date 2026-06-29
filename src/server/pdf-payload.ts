import { Skill, type WritingTaskType } from "@prisma/client";
import { db } from "@/lib/db";
import { SKILL_META, type SkillKey } from "@/lib/roadmap";
import { getEntitlements, isRoadmapLessonLocked } from "@/lib/entitlements";
import {
  vocabContentSchema,
  hanziContentSchema,
  writingContentSchema,
  writingReorderContentSchema,
  isReorderWriting,
  speakingContentSchema,
  normalizeReadingContent,
  normalizeListeningContent,
} from "@/lib/roadmap-content";
import { parseGrammarContent } from "@/lib/grammar";
import { toPdfQuestions } from "@/components/learn/roadmap/roadmap-pdf";
import type { PdfQuestion } from "@/components/learn/pdf/pdf-question-list";
import type { PdfPayload } from "@/components/learn/pdf/payload";

/**
 * Tải + map dữ liệu cho MỘT tài liệu PDF. Dùng chung cho trang xem trước (server
 * component) và route /api/pdf/* (tạo PDF). Không tự kiểm tra đăng nhập — caller
 * (đã `auth()`) truyền userId/role cho phần lộ trình.
 */
export type PdfLoadResult =
  | { status: "ok"; payload: PdfPayload; fileName: string; backHref?: string }
  | { status: "notfound" }
  | { status: "locked"; backHref: string };

const WRITING_TYPE_LABEL: Record<WritingTaskType, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết theo gợi ý",
  PICTURE_DESCRIPTION: "Mô tả tranh",
};
const ROADMAP_WRITING_LABEL: Record<string, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết có gợi ý",
  PICTURE_DESCRIPTION: "Tả tranh",
};
const SKILL_FILE_LABEL: Record<SkillKey, string> = {
  VOCAB: "Tu vung",
  GRAMMAR: "Ngu phap",
  HANZI: "Chu Han",
  READING: "Doc hieu",
  LISTENING: "Nghe hieu",
  WRITING: "Viet",
  SPEAKING: "Luyen noi",
};

function mapQuestions(qs: { id: string; type: string; prompt: string; promptPinyin: string | null; options: unknown; correctAnswer: unknown; explanation: string | null; supportingQuote: string | null }[]): PdfQuestion[] {
  return qs.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    promptPinyin: q.promptPinyin,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    supportingQuote: q.supportingQuote,
  }));
}

function toExamples(raw: unknown): { hanzi: string; pinyin: string; meaning: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    return { hanzi: String(o.hanzi ?? ""), pinyin: String(o.pinyin ?? ""), meaning: String(o.meaning ?? "") };
  });
}
function toSentences(raw: unknown): { text: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { text: String(o.text ?? o.hanzi ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((s) => s.text);
}
function toPassage(raw: unknown): { text: string; pinyin?: string } | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const text = String(o.text ?? o.hanzi ?? "");
  return text ? { text, pinyin: o.pinyin ? String(o.pinyin) : undefined } : null;
}
function toSpeakingQuestions(raw: unknown): { question: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { question: String(o.question ?? o.text ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((q) => q.question);
}

export async function loadReadingPayload(testId: string): Promise<PdfLoadResult> {
  const test = await db.readingTest.findUnique({ where: { id: testId }, include: { questions: { orderBy: { order: "asc" } } } });
  if (!test || !test.published) return { status: "notfound" };
  return {
    status: "ok",
    fileName: `DingDong HSK - Doc hieu - ${test.title}`,
    payload: {
      kind: "reading",
      props: { title: test.title, titleZh: test.titleZh, hskLevel: test.hskLevel, passage: test.passage, passagePinyin: test.passagePinyin, questions: mapQuestions(test.questions) },
    },
  };
}

export async function loadListeningPayload(testId: string): Promise<PdfLoadResult> {
  const test = await db.listeningTest.findUnique({ where: { id: testId }, include: { questions: { orderBy: { order: "asc" } } } });
  if (!test || !test.published) return { status: "notfound" };
  return {
    status: "ok",
    fileName: `DingDong HSK - Nghe hieu - ${test.title}`,
    payload: {
      kind: "listening",
      props: { title: test.title, hskLevel: test.hskLevel, transcript: test.transcript, questions: mapQuestions(test.questions) },
    },
  };
}

export async function loadWritingPayload(taskId: string): Promise<PdfLoadResult> {
  const task = await db.writingTask.findUnique({ where: { id: taskId } });
  if (!task || !task.published) return { status: "notfound" };
  const shortPrompt = task.prompt.length > 60 ? task.prompt.slice(0, 60) + "…" : task.prompt;
  return {
    status: "ok",
    fileName: `DingDong HSK - Viet - ${shortPrompt || task.id}`,
    payload: {
      kind: "writing",
      props: {
        title: shortPrompt || "Bài viết",
        taskTypeLabel: WRITING_TYPE_LABEL[task.taskType],
        hskLevel: task.hskLevel,
        prompt: task.prompt,
        promptZh: task.promptZh,
        outline: task.outline,
        minChars: task.minChars,
        timeLimit: task.timeLimit,
      },
    },
  };
}

export async function loadSpeakingPayload(setId: string): Promise<PdfLoadResult> {
  const set = await db.speakingSet.findUnique({ where: { id: setId } });
  if (!set || !set.published) return { status: "notfound" };
  const title = set.title || "Bài luyện nói";
  return {
    status: "ok",
    fileName: `DingDong HSK - Luyen noi - ${title}`,
    payload: {
      kind: "speaking",
      props: { title, hskLevel: set.hskLevel, part1: toSentences(set.part1Sentences), part2: toPassage(set.part2Passage), part3: toSpeakingQuestions(set.part3Questions) },
    },
  };
}

export async function loadVocabPayload(lessonId: string): Promise<PdfLoadResult> {
  const lesson = await db.vocabLesson.findUnique({ where: { id: lessonId }, include: { unit: true, words: { orderBy: { order: "asc" } } } });
  if (!lesson || !lesson.published || !lesson.unit.published) return { status: "notfound" };
  const title = lesson.title || "Bài từ vựng";
  return {
    status: "ok",
    fileName: `DingDong HSK - Tu vung - ${title}`,
    payload: {
      kind: "vocab",
      props: {
        lessonTitle: title,
        unitTitle: lesson.unit.title,
        unitTitleZh: lesson.unit.titleZh,
        hskLevel: lesson.unit.hskLevel,
        words: lesson.words.map((w) => ({ id: w.id, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, examples: toExamples(w.examples) })),
      },
    },
  };
}

export async function loadGrammarPayload(lessonId: string): Promise<PdfLoadResult> {
  const lesson = await db.grammarLesson.findUnique({ where: { id: lessonId }, include: { unit: true } });
  if (!lesson || !lesson.published || !lesson.unit.published) return { status: "notfound" };
  const title = lesson.title || "Bài ngữ pháp";
  return {
    status: "ok",
    fileName: `DingDong HSK - Ngu phap - ${title}`,
    payload: {
      kind: "grammar",
      props: { lessonTitle: title, unitTitle: lesson.unit.title, unitTitleZh: lesson.unit.titleZh, hskLevel: lesson.unit.hskLevel, content: parseGrammarContent(lesson.exercises) },
    },
  };
}

const SKILL_KEYS = SKILL_META.map((m) => m.key);

export async function loadRoadmapPayload(lessonId: string, skillSlug: string, userId: string, role?: string): Promise<PdfLoadResult> {
  const skillKey = skillSlug.toUpperCase() as SkillKey;
  if (!SKILL_KEYS.includes(skillKey)) return { status: "notfound" };

  const section = await db.roadmapSection.findUnique({
    where: { lessonId_skill: { lessonId, skill: skillKey as Skill } },
    include: { lesson: { include: { course: true } } },
  });
  if (!section || !section.published) return { status: "notfound" };
  const { lesson } = section;
  if (!lesson.course.published) return { status: "notfound" };

  const { levelToSlug } = await import("@/lib/roadmap");
  const slug = levelToSlug(lesson.course.hskLevel);
  const backHref = `/roadmap/${slug}`;

  const ent = await getEntitlements(userId, role);
  const lessonIndex = await db.roadmapLesson.count({ where: { courseId: lesson.courseId, order: { lt: lesson.order } } });
  if (isRoadmapLessonLocked(ent, lesson.course.hskLevel, lessonIndex)) return { status: "locked", backHref };

  const hskLevel = lesson.course.hskLevel;
  const content = section.content;
  const fileName = `DingDong HSK - ${SKILL_FILE_LABEL[skillKey]} - ${lesson.topic}`;

  let payload: PdfPayload;
  switch (skillKey) {
    case "VOCAB": {
      const p = vocabContentSchema.safeParse(content);
      if (!p.success) return { status: "notfound" };
      payload = {
        kind: "vocab",
        props: {
          lessonTitle: lesson.topic,
          unitTitle: "Lộ trình · Từ vựng",
          hskLevel,
          words: p.data.words.map((w, i) => ({ id: `w${i}`, hanzi: w.hanzi, pinyin: w.pinyin, meaning: w.meaning, examples: w.examples ?? [] })),
        },
      };
      break;
    }
    case "GRAMMAR":
      payload = { kind: "grammar", props: { lessonTitle: lesson.topic, unitTitle: "Lộ trình · Ngữ pháp", hskLevel, content: parseGrammarContent(content) } };
      break;
    case "HANZI": {
      const p = hanziContentSchema.safeParse(content);
      if (!p.success) return { status: "notfound" };
      payload = {
        kind: "hanzi",
        props: {
          lessonTitle: lesson.topic,
          hskLevel,
          characters: p.data.characters.map((c) => ({ character: c.character, pinyin: c.pinyin, tone: c.tone, meaning: c.meaning, strokeCount: c.strokeCount, examples: c.examples ?? [] })),
        },
      };
      break;
    }
    case "READING": {
      const c = normalizeReadingContent(content);
      if (!c.passages.length) return { status: "notfound" };
      payload = {
        kind: "roadmap-reading",
        props: {
          title: c.title || lesson.topic,
          titleZh: c.titleZh,
          hskLevel,
          passages: c.passages.map((p) => ({ passage: p.passage, passagePinyin: p.passagePinyin, titleZh: p.titleZh, questions: toPdfQuestions(p.questions) })),
        },
      };
      break;
    }
    case "LISTENING": {
      const c = normalizeListeningContent(content);
      if (!c.clips.length) return { status: "notfound" };
      payload = {
        kind: "roadmap-listening",
        props: { title: c.title || lesson.topic, hskLevel, clips: c.clips.map((cl) => ({ title: cl.title, transcript: cl.transcript, questions: toPdfQuestions(cl.questions) })) },
      };
      break;
    }
    case "WRITING": {
      // "连词成句" (sắp xếp câu): in thẻ từ cho sẵn + câu đúng & bản dịch.
      if (isReorderWriting(content)) {
        const p = writingReorderContentSchema.safeParse(content);
        if (!p.success) return { status: "notfound" };
        payload = {
          kind: "roadmap-writing-reorder",
          props: {
            title: lesson.topic,
            titleZh: lesson.topicZh || p.data.title || null,
            hskLevel,
            sentences: p.data.sentences.map((s) => ({ words: s.words, answer: s.answer, translation: s.translation })),
          },
        };
        break;
      }
      const p = writingContentSchema.safeParse(content);
      if (!p.success) return { status: "notfound" };
      const d = p.data;
      payload = {
        kind: "writing",
        props: { title: lesson.topic, taskTypeLabel: ROADMAP_WRITING_LABEL[d.taskType] ?? "Viết luận", hskLevel, prompt: d.prompt, promptZh: d.promptZh, outline: d.outline, minChars: d.minChars, timeLimit: d.timeLimit },
      };
      break;
    }
    case "SPEAKING": {
      const p = speakingContentSchema.safeParse(content);
      if (!p.success) return { status: "notfound" };
      const d = p.data;
      payload = { kind: "speaking", props: { title: lesson.topic, hskLevel, part1: d.part1Sentences ?? [], part2: d.part2Passage ?? null, part3: d.part3Questions ?? [] } };
      break;
    }
    default:
      return { status: "notfound" };
  }

  return { status: "ok", payload, fileName, backHref };
}
