"use client";
// Lộ trình — phần Nghe NHIỀU đoạn: chạy lại trình Nghe một-đoạn cho từng clip,
// làm lần lượt, mỗi clip chấm riêng; xong clip cuối ghi hoàn thành với điểm
// TRUNG BÌNH (chấm chung). Tái dùng ListeningTestClient qua onContinue.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HSKLevel, QuestionType } from "@prisma/client";
import { ListeningTestClient } from "@/app/(learn)/listening/[testId]/listening-test-client";
import { roadmapQuestionId, type ListeningClipContent } from "@/lib/roadmap-content";
import type { ListeningTestData, ListeningQuestion } from "@/components/learn/listening/types";
import {
  gradeRoadmapListeningClipAction,
  completeRoadmapSectionAction,
} from "@/server/actions/roadmap-play";

interface Props {
  sectionId: string;
  lessonId: string;
  hskLevel: HSKLevel;
  title: string;
  clips: ListeningClipContent[];
  timeLimit: number;
  backHref: string;
}

export function RoadmapMultiListeningPlayer({
  sectionId,
  lessonId,
  hskLevel,
  title,
  clips,
  timeLimit,
  backHref,
}: Props) {
  const router = useRouter();
  const total = clips.length;
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>(() => clips.map(() => -1));
  const [durations, setDurations] = useState<number[]>(() => clips.map(() => 0));
  const [finalizing, setFinalizing] = useState(false);

  const c = clips[index];
  const isLast = index === total - 1;
  const perTime = Math.max(60, Math.round(timeLimit / total));

  const test: ListeningTestData = {
    id: `${sectionId}-c${index}`,
    title: `${c.title || title} · Đoạn ${index + 1}/${total}`,
    hskLevel,
    audioUrl: c.audioUrl ?? "",
    transcript: c.transcript ?? null,
    transcriptExplanation: c.transcriptExplanation ?? null,
    imageUrl: c.imageUrl ?? null,
    timeLimit: perTime,
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

  async function finalize() {
    if (finalizing) return;
    setFinalizing(true);
    const valid = scores.filter((s) => s >= 0);
    const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const r = await completeRoadmapSectionAction({
      lessonId,
      skill: "LISTENING",
      score: avg,
      durationSec: totalDuration,
    });
    setFinalizing(false);
    if (r.ok) {
      toast.success(`Hoàn thành phần Nghe · ${avg}%`);
      router.push(backHref);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <ListeningTestClient
      key={index}
      test={test}
      backHref={backHref}
      onSubmit={async ({ answers, durationSec }) => {
        const r = await gradeRoadmapListeningClipAction({
          sectionId,
          clipIndex: index,
          answers,
          durationSec,
        });
        if (r.ok) {
          setScores((s) => s.map((v, i) => (i === index ? r.result.score : v)));
          setDurations((d) => d.map((v, i) => (i === index ? durationSec : v)));
        }
        return { ok: r.ok, result: r.ok ? r.result : undefined };
      }}
      onContinue={isLast ? finalize : () => setIndex((i) => Math.min(total - 1, i + 1))}
      continueLabel={
        isLast
          ? finalizing
            ? "Đang lưu…"
            : "Hoàn thành phần Nghe →"
          : `Tiếp tục đoạn ${index + 2}/${total} →`
      }
    />
  );
}
