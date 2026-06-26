import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Skill } from "@prisma/client";
import { SKILL_META, levelToSlug, type SkillKey } from "@/lib/roadmap";
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
import {
  RoadmapReadingPdf,
  RoadmapListeningPdf,
  toPdfQuestions,
} from "@/components/learn/roadmap/roadmap-pdf";

interface Props {
  params: Promise<{ lessonId: string; skill: string }>;
}

const SKILL_KEYS = SKILL_META.map((m) => m.key);

const WRITING_TASK_LABEL: Record<string, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết có gợi ý",
  PICTURE_DESCRIPTION: "Tả tranh",
};

/** PDF (tải/in) cho MỘT phần kỹ năng trong lộ trình — dùng lại các component PDF
 *  của phần Luyện kỹ năng, đọc nội dung từ RoadmapSection.content theo từng kỹ năng. */
export default async function RoadmapPdfPage({ params }: Props) {
  const { lessonId, skill: skillSlug } = await params;
  const skillKey = skillSlug.toUpperCase() as SkillKey;
  if (!SKILL_KEYS.includes(skillKey)) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");

  const section = await db.roadmapSection.findUnique({
    where: { lessonId_skill: { lessonId, skill: skillKey as Skill } },
    include: { lesson: { include: { course: true } } },
  });
  if (!section || !section.published) notFound();
  const { lesson } = section;
  if (!lesson.course.published) notFound();

  // Chặn theo gói — giống trang chơi: người miễn phí chỉ mở FREE_ROADMAP_LESSONS bài đầu.
  const ent = await getEntitlements(session.user.id, (session.user as { role?: string }).role);
  const lessonIndex = await db.roadmapLesson.count({
    where: { courseId: lesson.courseId, order: { lt: lesson.order } },
  });
  const slug = levelToSlug(lesson.course.hskLevel);
  if (isRoadmapLessonLocked(ent, lesson.course.hskLevel, lessonIndex)) redirect(`/roadmap/${slug}`);

  const hskLevel = lesson.course.hskLevel;
  const backHref = `/roadmap/${slug}`;
  const content = section.content;

  let body: React.ReactNode;
  switch (skillKey) {
    case "VOCAB": {
      const p = vocabContentSchema.safeParse(content);
      if (!p.success) notFound();
      body = (
        <VocabPdf
          lessonTitle={lesson.topic}
          unitTitle="Lộ trình · Từ vựng"
          hskLevel={hskLevel}
          words={p.data.words.map((w, i) => ({
            id: `w${i}`,
            hanzi: w.hanzi,
            pinyin: w.pinyin,
            meaning: w.meaning,
            examples: w.examples ?? [],
          }))}
          backHref={backHref}
        />
      );
      break;
    }
    case "GRAMMAR": {
      const parsed = parseGrammarContent(content);
      body = (
        <LessonPdf
          lessonTitle={lesson.topic}
          unitTitle="Lộ trình · Ngữ pháp"
          hskLevel={hskLevel}
          content={parsed}
          backHref={backHref}
        />
      );
      break;
    }
    case "HANZI": {
      const p = hanziContentSchema.safeParse(content);
      if (!p.success) notFound();
      body = (
        <HanziPdf
          lessonTitle={lesson.topic}
          hskLevel={hskLevel}
          characters={p.data.characters.map((c) => ({
            character: c.character,
            pinyin: c.pinyin,
            tone: c.tone,
            meaning: c.meaning,
            strokeCount: c.strokeCount,
            examples: c.examples ?? [],
          }))}
          backHref={backHref}
        />
      );
      break;
    }
    case "READING": {
      const c = normalizeReadingContent(content);
      if (!c.passages.length) notFound();
      body = (
        <RoadmapReadingPdf
          title={c.title || lesson.topic}
          titleZh={c.titleZh}
          hskLevel={hskLevel}
          passages={c.passages.map((p) => ({
            passage: p.passage,
            passagePinyin: p.passagePinyin,
            titleZh: p.titleZh,
            questions: toPdfQuestions(p.questions),
          }))}
          backHref={backHref}
        />
      );
      break;
    }
    case "LISTENING": {
      const c = normalizeListeningContent(content);
      if (!c.clips.length) notFound();
      body = (
        <RoadmapListeningPdf
          title={c.title || lesson.topic}
          hskLevel={hskLevel}
          clips={c.clips.map((cl) => ({
            title: cl.title,
            transcript: cl.transcript,
            questions: toPdfQuestions(cl.questions),
          }))}
          backHref={backHref}
        />
      );
      break;
    }
    case "WRITING": {
      const p = writingContentSchema.safeParse(content);
      if (!p.success) notFound();
      const d = p.data;
      body = (
        <WritingPdf
          title={lesson.topic}
          taskTypeLabel={WRITING_TASK_LABEL[d.taskType] ?? "Viết luận"}
          hskLevel={hskLevel}
          prompt={d.prompt}
          promptZh={d.promptZh}
          outline={d.outline}
          minChars={d.minChars}
          timeLimit={d.timeLimit}
          backHref={backHref}
        />
      );
      break;
    }
    case "SPEAKING": {
      const p = speakingContentSchema.safeParse(content);
      if (!p.success) notFound();
      const d = p.data;
      body = (
        <SpeakingPdf
          title={lesson.topic}
          hskLevel={hskLevel}
          part1={d.part1Sentences ?? []}
          part2={d.part2Passage ?? null}
          part3={d.part3Questions ?? []}
          backHref={backHref}
        />
      );
      break;
    }
    default:
      notFound();
  }

  return <div className="min-h-screen bg-muted/20 px-4 py-6">{body}</div>;
}
