"use client";
import { useRouter } from "next/navigation";
import type { HSKLevel, QuestionType, WritingTaskType } from "@prisma/client";
import type { SkillKey } from "@/lib/roadmap";
import { GrammarFlow } from "@/components/learn/grammar/grammar-flow";
import { RoadmapHanziPlayer } from "./roadmap-hanzi-player";
import { RoadmapVocabPlayer } from "./roadmap-vocab-player";
import { RoadmapWritingPlayer } from "./roadmap-writing-player";
import { ReadingTestClient } from "@/app/(learn)/reading/[testId]/reading-test-client";
import { ListeningTestClient } from "@/app/(learn)/listening/[testId]/listening-test-client";
import { WritingClient } from "@/app/(learn)/writing/[taskId]/writing-client";
import { SpeakingClient } from "@/app/(learn)/speaking/[setId]/speaking-client";
import { parseGrammarContent } from "@/lib/grammar";
import {
  roadmapQuestionId,
  normalizeReadingContent,
  normalizeListeningContent,
  buildRoadmapVocabCards,
  isReorderWriting,
} from "@/lib/roadmap-content";
import type {
  HanziSectionContent,
  WritingSectionContent,
  SpeakingSectionContent,
} from "@/lib/roadmap-content";
import { RoadmapMultiReadingPlayer } from "./roadmap-multi-reading-player";
import { RoadmapMultiListeningPlayer } from "./roadmap-multi-listening-player";
import { ROADMAP_PASS_THRESHOLD } from "./pass-status";
import {
  completeRoadmapSectionAction,
  submitRoadmapReadingAction,
  submitRoadmapListeningAction,
  gradeRoadmapWritingAction,
  gradeRoadmapSpeakingAction,
} from "@/server/actions/roadmap-play";
import type { ReadingTestData, ReadingQuestion } from "@/components/learn/reading/types";
import type { ListeningTestData, ListeningQuestion } from "@/components/learn/listening/types";
import type { WordReviewState } from "@/types";

interface Props {
  skill: SkillKey;
  lessonId: string;
  sectionId: string;
  hskLevel: HSKLevel;
  title: string;
  content: unknown;
  backHref: string;
  /** Chỉ dùng cho VOCAB: lịch SRS đã lưu (RoadmapWordReview) cho các từ của phần. */
  vocabReviews?: WordReviewState[];
  /** Chỉ dùng cho VOCAB: phần Từ vựng đã hoàn thành → mở thẳng tab Ôn từ. */
  vocabCompleted?: boolean;
}

export function RoadmapSectionPlayer({
  skill,
  lessonId,
  sectionId,
  hskLevel,
  title,
  content,
  backHref,
  vocabReviews = [],
  vocabCompleted = false,
}: Props) {
  const router = useRouter();

  switch (skill) {
    case "VOCAB": {
      const words = buildRoadmapVocabCards(sectionId, content);
      return (
        <RoadmapVocabPlayer
          sectionId={sectionId}
          title={title}
          words={words}
          reviews={vocabReviews}
          completed={vocabCompleted}
          passThreshold={ROADMAP_PASS_THRESHOLD}
          backHref={backHref}
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
          passThreshold={ROADMAP_PASS_THRESHOLD}
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
      const c = normalizeReadingContent(content);
      // Nhiều đoạn → trình chạy lần lượt (chấm chung); một đoạn → trình Đọc gốc.
      if (c.passages.length > 1) {
        return (
          <RoadmapMultiReadingPlayer
            sectionId={sectionId}
            lessonId={lessonId}
            hskLevel={hskLevel}
            title={c.title}
            passages={c.passages}
            timeLimit={c.timeLimit}
            backHref={backHref}
            passThreshold={ROADMAP_PASS_THRESHOLD}
          />
        );
      }
      const p = c.passages[0] ?? { passage: "", questions: [] };
      const test: ReadingTestData = {
        id: sectionId,
        title: c.title,
        titleZh: p.titleZh ?? c.titleZh ?? "",
        hskLevel,
        passage: p.passage,
        passagePinyin: p.passagePinyin ?? null,
        imageUrl: p.imageUrl ?? null,
        timeLimit: c.timeLimit ?? 600,
        questions: (p.questions ?? []).map(
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
          passThreshold={ROADMAP_PASS_THRESHOLD}
          onSubmit={async ({ answers, durationSec }) => {
            const r = await submitRoadmapReadingAction({ sectionId, answers, durationSec });
            router.refresh();
            return { ok: r.ok, result: r.ok ? r.result : undefined };
          }}
        />
      );
    }

    case "LISTENING": {
      const c = normalizeListeningContent(content);
      if (c.clips.length > 1) {
        return (
          <RoadmapMultiListeningPlayer
            sectionId={sectionId}
            lessonId={lessonId}
            hskLevel={hskLevel}
            title={c.title}
            clips={c.clips}
            timeLimit={c.timeLimit}
            backHref={backHref}
            passThreshold={ROADMAP_PASS_THRESHOLD}
          />
        );
      }
      const cl = c.clips[0] ?? { audioUrl: "", questions: [] };
      const test: ListeningTestData = {
        id: sectionId,
        title: c.title,
        hskLevel,
        audioUrl: cl.audioUrl ?? "",
        transcript: cl.transcript ?? null,
        transcriptExplanation: cl.transcriptExplanation ?? null,
        imageUrl: cl.imageUrl ?? null,
        timeLimit: c.timeLimit ?? 180,
        questions: (cl.questions ?? []).map(
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
          passThreshold={ROADMAP_PASS_THRESHOLD}
          onSubmit={async ({ answers, durationSec }) => {
            const r = await submitRoadmapListeningAction({ sectionId, answers, durationSec });
            router.refresh();
            return { ok: r.ok, result: r.ok ? r.result : undefined };
          }}
        />
      );
    }

    case "WRITING": {
      // "连词成句" (sắp xếp câu — format thi viết HSK2): chấm tự động, không AI.
      if (isReorderWriting(content)) {
        return (
          <RoadmapWritingPlayer
            title={content.title || title}
            sentences={content.sentences}
            backHref={backHref}
            passThreshold={ROADMAP_PASS_THRESHOLD}
            onComplete={async (s) => {
              const r = await completeRoadmapSectionAction({
                lessonId,
                skill: "WRITING",
                correct: s.correct,
                total: s.total,
                durationSec: s.durationSec,
              });
              return { ok: r.ok };
            }}
          />
        );
      }
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
          passThreshold={ROADMAP_PASS_THRESHOLD}
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
          passThreshold={ROADMAP_PASS_THRESHOLD}
          gradeAction={async (args) => gradeRoadmapSpeakingAction({ sectionId, ...args })}
          onFinish={async (score) => {
            const r = await completeRoadmapSectionAction({ lessonId, skill: "SPEAKING", score });
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
