import { createElement, type ReactElement } from "react";
import { NextRequest } from "next/server";
import { Skill } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SKILL_META, type SkillKey } from "@/lib/roadmap";
import { getEntitlements, isRoadmapLessonLocked } from "@/lib/entitlements";
import {
  vocabContentSchema,
  hanziContentSchema,
  writingContentSchema,
  speakingContentSchema,
  normalizeReadingContent,
  normalizeListeningContent,
} from "@/lib/roadmap-content";
import { parseGrammarContent } from "@/lib/grammar";
import { VocabPdf } from "@/components/learn/vocab/vocab-pdf";
import { LessonPdf } from "@/components/learn/grammar/lesson-pdf";
import { HanziPdf } from "@/components/learn/hanzi/hanzi-pdf";
import { WritingPdf } from "@/components/learn/writing/writing-pdf";
import { SpeakingPdf } from "@/components/learn/speaking/speaking-pdf";
import { RoadmapReadingPdf, RoadmapListeningPdf, toPdfQuestions } from "@/components/learn/roadmap/roadmap-pdf";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKILL_KEYS = SKILL_META.map((m) => m.key);
const SKILL_LABEL: Record<SkillKey, string> = {
  VOCAB: "Tu vung",
  GRAMMAR: "Ngu phap",
  HANZI: "Chu Han",
  READING: "Doc hieu",
  LISTENING: "Nghe hieu",
  WRITING: "Viet",
  SPEAKING: "Luyen noi",
};
const WRITING_TASK_LABEL: Record<string, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết có gợi ý",
  PICTURE_DESCRIPTION: "Tả tranh",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string; skill: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();

  const { lessonId, skill: skillSlug } = await params;
  const skillKey = skillSlug.toUpperCase() as SkillKey;
  if (!SKILL_KEYS.includes(skillKey)) return pdfNotFound();

  const section = await db.roadmapSection.findUnique({
    where: { lessonId_skill: { lessonId, skill: skillKey as Skill } },
    include: { lesson: { include: { course: true } } },
  });
  if (!section || !section.published) return pdfNotFound();
  const { lesson } = section;
  if (!lesson.course.published) return pdfNotFound();

  // Chặn theo gói — giống trang chơi: người miễn phí chỉ mở FREE_ROADMAP_LESSONS bài đầu.
  const ent = await getEntitlements(session.user.id, (session.user as { role?: string }).role);
  const lessonIndex = await db.roadmapLesson.count({
    where: { courseId: lesson.courseId, order: { lt: lesson.order } },
  });
  if (isRoadmapLessonLocked(ent, lesson.course.hskLevel, lessonIndex)) {
    return new Response("Bài học đã khoá — mở khoá lộ trình để tải PDF.", { status: 403 });
  }

  const hskLevel = lesson.course.hskLevel;
  const content = section.content;
  const fileName = `DingDong HSK - ${SKILL_LABEL[skillKey]} - ${lesson.topic}`;

  let node: ReactElement;
  switch (skillKey) {
    case "VOCAB": {
      const p = vocabContentSchema.safeParse(content);
      if (!p.success) return pdfNotFound();
      node = createElement(VocabPdf, {
        lessonTitle: lesson.topic,
        unitTitle: "Lộ trình · Từ vựng",
        hskLevel,
        words: p.data.words.map((w, i) => ({
          id: `w${i}`,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          meaning: w.meaning,
          examples: w.examples ?? [],
        })),
      });
      break;
    }
    case "GRAMMAR": {
      node = createElement(LessonPdf, {
        lessonTitle: lesson.topic,
        unitTitle: "Lộ trình · Ngữ pháp",
        hskLevel,
        content: parseGrammarContent(content),
      });
      break;
    }
    case "HANZI": {
      const p = hanziContentSchema.safeParse(content);
      if (!p.success) return pdfNotFound();
      node = createElement(HanziPdf, {
        lessonTitle: lesson.topic,
        hskLevel,
        characters: p.data.characters.map((c) => ({
          character: c.character,
          pinyin: c.pinyin,
          tone: c.tone,
          meaning: c.meaning,
          strokeCount: c.strokeCount,
          examples: c.examples ?? [],
        })),
      });
      break;
    }
    case "READING": {
      const c = normalizeReadingContent(content);
      if (!c.passages.length) return pdfNotFound();
      node = createElement(RoadmapReadingPdf, {
        title: c.title || lesson.topic,
        titleZh: c.titleZh,
        hskLevel,
        passages: c.passages.map((p) => ({
          passage: p.passage,
          passagePinyin: p.passagePinyin,
          titleZh: p.titleZh,
          questions: toPdfQuestions(p.questions),
        })),
      });
      break;
    }
    case "LISTENING": {
      const c = normalizeListeningContent(content);
      if (!c.clips.length) return pdfNotFound();
      node = createElement(RoadmapListeningPdf, {
        title: c.title || lesson.topic,
        hskLevel,
        clips: c.clips.map((cl) => ({
          title: cl.title,
          transcript: cl.transcript,
          questions: toPdfQuestions(cl.questions),
        })),
      });
      break;
    }
    case "WRITING": {
      const p = writingContentSchema.safeParse(content);
      if (!p.success) return pdfNotFound();
      const d = p.data;
      node = createElement(WritingPdf, {
        title: lesson.topic,
        taskTypeLabel: WRITING_TASK_LABEL[d.taskType] ?? "Viết luận",
        hskLevel,
        prompt: d.prompt,
        promptZh: d.promptZh,
        outline: d.outline,
        minChars: d.minChars,
        timeLimit: d.timeLimit,
      });
      break;
    }
    case "SPEAKING": {
      const p = speakingContentSchema.safeParse(content);
      if (!p.success) return pdfNotFound();
      const d = p.data;
      node = createElement(SpeakingPdf, {
        title: lesson.topic,
        hskLevel,
        part1: d.part1Sentences ?? [],
        part2: d.part2Passage ?? null,
        part3: d.part3Questions ?? [],
      });
      break;
    }
    default:
      return pdfNotFound();
  }

  try {
    return await renderPdfResponse(node, fileName);
  } catch (err) {
    return pdfError(err);
  }
}
