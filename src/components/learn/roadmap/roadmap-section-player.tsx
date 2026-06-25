"use client";
import { useRouter } from "next/navigation";
import type { HSKLevel, QuestionType, WritingTaskType } from "@prisma/client";
import type { SkillKey } from "@/lib/roadmap";
import { WordFlow } from "@/components/learn/vocab/word-flow";
import { GrammarFlow } from "@/components/learn/grammar/grammar-flow";
import { RoadmapHanziPlayer } from "./roadmap-hanzi-player";
import { ReadingTestClient } from "@/app/(learn)/reading/[testId]/reading-test-client";
import { ListeningTestClient } from "@/app/(learn)/listening/[testId]/listening-test-client";
import { WritingClient } from "@/app/(learn)/writing/[taskId]/writing-client";
import { SpeakingClient } from "@/app/(learn)/speaking/[setId]/speaking-client";
import { parseGrammarContent } from "@/lib/grammar";
import { roadmapQuestionId } from "@/lib/roadmap-content";
import type {
  VocabSectionContent,
  HanziSectionContent,
  ReadingSectionContent,
  ListeningSectionContent,
  WritingSectionContent,
  SpeakingSectionContent,
} from "@/lib/roadmap-content";
import {
  completeRoadmapSectionAction,
  submitRoadmapReadingAction,
  submitRoadmapListeningAction,
  gradeRoadmapWritingAction,
  gradeRoadmapSpeakingAction,
} from "@/server/actions/roadmap-play";
import type { ReadingTestData, ReadingQuestion } from "@/components/learn/reading/types";
import type { ListeningTestData, ListeningQuestion } from "@/components/learn/listening/types";
import type { VocabWordCard } from "@/types";

interface Props {
  skill: SkillKey;
  lessonId: string;
  sectionId: string;
  hskLevel: HSKLevel;
  title: string;
  content: unknown;
  backHref: string;
}

export function RoadmapSectionPlayer({ skill, lessonId, sectionId, hskLevel, title, content, backHref }: Props) {
  const router = useRouter();

  switch (skill) {
    case "VOCAB": {
      const c = content as VocabSectionContent;
      const words: VocabWordCard[] = (c.words ?? []).map((w, i) => ({
        id: `${sectionId}-w${i}`,
        lessonId: `roadmap:${sectionId}`,
        order: i + 1,
        hanzi: w.hanzi,
        pinyin: w.pinyin,
        meaning: w.meaning,
        examples: w.examples ?? [],
        audioUrl: w.audioUrl ?? null,
      }));
      return (
        <WordFlow
          lesson={{ id: `roadmap:${sectionId}`, title }}
          words={words}
          unitId=""
          disablePositionSave
          onExit={() => router.push(backHref)}
          onComplete={async (s) => {
            const r = await completeRoadmapSectionAction({
              lessonId,
              skill: "VOCAB",
              correct: s.correct,
              total: s.total,
              durationSec: s.durationSec,
            });
            return { ok: r.ok, xpEarned: r.ok ? r.xpEarned : 0 };
          }}
        />
      );
    }

    case "GRAMMAR": {
      const parsed = parseGrammarContent(content);
      return (
        <GrammarFlow
          lesson={{ id: `roadmap:${sectionId}`, title }}
          content={parsed}
          unitId=""
          showTest={false}
          closeHref={backHref}
          onComplete={async (s) => {
            const r = await completeRoadmapSectionAction({
              lessonId,
              skill: "GRAMMAR",
              correct: s.correct,
              total: s.total,
              durationSec: s.durationSec,
            });
            return { ok: r.ok };
          }}
        />
      );
    }

    case "HANZI": {
      const c = content as HanziSectionContent;
      return (
        <RoadmapHanziPlayer
          closeHref={backHref}
          characters={(c.characters ?? []).map((ch) => ({
            character: ch.character,
            pinyin: ch.pinyin,
            tone: ch.tone,
            meaning: ch.meaning,
            strokeCount: ch.strokeCount,
            examples: ch.examples ?? [],
          }))}
          onComplete={async () => {
            const r = await completeRoadmapSectionAction({ lessonId, skill: "HANZI" });
            return { ok: r.ok };
          }}
        />
      );
    }

    case "READING": {
      const c = content as ReadingSectionContent;
      const test: ReadingTestData = {
        id: sectionId,
        title: c.title,
        titleZh: c.titleZh ?? "",
        hskLevel,
        passage: c.passage,
        passagePinyin: c.passagePinyin ?? null,
        imageUrl: c.imageUrl ?? null,
        timeLimit: c.timeLimit ?? 600,
        questions: (c.questions ?? []).map(
          (q, i): ReadingQuestion => ({
            id: roadmapQuestionId(i),
            type: q.type as QuestionType,
            prompt: q.prompt,
            promptPinyin: q.promptPinyin ?? null,
            promptTranslation: q.promptTranslation ?? null,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? null,
            supportingQuote: q.supportingQuote ?? null,
            quoteTranslation: q.quoteTranslation ?? null,
            order: i + 1,
          })
        ),
      };
      return (
        <ReadingTestClient
          test={test}
          backHref={backHref}
          onSubmit={async ({ answers, durationSec }) => {
            const r = await submitRoadmapReadingAction({ sectionId, answers, durationSec });
            router.refresh();
            return { ok: r.ok, result: r.ok ? r.result : undefined };
          }}
        />
      );
    }

    case "LISTENING": {
      const c = content as ListeningSectionContent;
      const test: ListeningTestData = {
        id: sectionId,
        title: c.title,
        hskLevel,
        audioUrl: c.audioUrl ?? "",
        transcript: c.transcript ?? null,
        transcriptExplanation: c.transcriptExplanation ?? null,
        imageUrl: c.imageUrl ?? null,
        timeLimit: c.timeLimit ?? 180,
        questions: (c.questions ?? []).map(
          (q, i): ListeningQuestion => ({
            id: roadmapQuestionId(i),
            type: q.type as QuestionType,
            prompt: q.prompt,
            promptPinyin: q.promptPinyin ?? null,
            promptTranslation: q.promptTranslation ?? null,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? null,
            supportingQuote: q.supportingQuote ?? null,
            quoteTranslation: q.quoteTranslation ?? null,
            order: i + 1,
          })
        ),
      };
      return (
        <ListeningTestClient
          test={test}
          backHref={backHref}
          onSubmit={async ({ answers, durationSec }) => {
            const r = await submitRoadmapListeningAction({ sectionId, answers, durationSec });
            router.refresh();
            return { ok: r.ok, result: r.ok ? r.result : undefined };
          }}
        />
      );
    }

    case "WRITING": {
      const c = content as WritingSectionContent;
      const task = {
        id: sectionId,
        taskType: c.taskType as WritingTaskType,
        prompt: c.prompt,
        promptZh: c.promptZh ?? null,
        outline: c.outline ?? null,
        imageUrl: c.imageUrl ?? null,
        minChars: c.minChars ?? 50,
        timeLimit: c.timeLimit ?? 900,
        hskLevel,
      };
      return (
        <WritingClient
          task={task}
          onGrade={async ({ submission, durationSec }) => {
            const r = await gradeRoadmapWritingAction({ sectionId, submission, durationSec });
            router.refresh();
            return r;
          }}
        />
      );
    }

    case "SPEAKING": {
      const c = content as SpeakingSectionContent;
      const set = {
        id: sectionId,
        hskLevel,
        title,
        part1Sentences: c.part1Sentences ?? [],
        part2Passage: c.part2Passage ?? { text: "", pinyin: "" },
        part3Questions: c.part3Questions ?? [],
      };
      return (
        <SpeakingClient
          set={set}
          gradeAction={async (args) => gradeRoadmapSpeakingAction({ sectionId, ...args })}
          onFinish={async () => {
            const r = await completeRoadmapSectionAction({ lessonId, skill: "SPEAKING" });
            if (!r.ok) throw new Error(r.error);
            router.refresh();
          }}
        />
      );
    }

    default:
      return null;
  }
}
