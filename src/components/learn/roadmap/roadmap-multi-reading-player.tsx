"use client";
// Lộ trình — phần Đọc NHIỀU đoạn: chạy lại trình Đọc một-đoạn cho từng đoạn,
// làm lần lượt, mỗi đoạn chấm riêng; xong đoạn cuối thì ghi hoàn thành với điểm
// TRUNG BÌNH các đoạn (chấm chung). Tái dùng ReadingTestClient qua onContinue.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HSKLevel, QuestionType } from "@prisma/client";
import { ReadingTestClient } from "@/app/(learn)/reading/[testId]/reading-test-client";
import { roadmapQuestionId, type ReadingPassageContent } from "@/lib/roadmap-content";
import type { ReadingTestData, ReadingQuestion } from "@/components/learn/reading/types";
import {
  gradeRoadmapReadingPassageAction,
  completeRoadmapSectionAction,
} from "@/server/actions/roadmap-play";

interface Props {
  sectionId: string;
  lessonId: string;
  hskLevel: HSKLevel;
  title: string;
  passages: ReadingPassageContent[];
  timeLimit: number;
  backHref: string;
}

export function RoadmapMultiReadingPlayer({
  sectionId,
  lessonId,
  hskLevel,
  title,
  passages,
  timeLimit,
  backHref,
}: Props) {
  const router = useRouter();
  const total = passages.length;
  const [index, setIndex] = useState(0);
  const [scores, setScores] = useState<number[]>(() => passages.map(() => -1));
  const [durations, setDurations] = useState<number[]>(() => passages.map(() => 0));
  const [finalizing, setFinalizing] = useState(false);

  const p = passages[index];
  const isLast = index === total - 1;
  const perTime = Math.max(60, Math.round(timeLimit / total));

  const test: ReadingTestData = {
    id: `${sectionId}-p${index}`,
    title: `${title} · Đoạn ${index + 1}/${total}`,
    titleZh: p.titleZh ?? "",
    hskLevel,
    passage: p.passage,
    passagePinyin: p.passagePinyin ?? null,
    imageUrl: p.imageUrl ?? null,
    timeLimit: perTime,
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

  async function finalize() {
    if (finalizing) return;
    setFinalizing(true);
    const valid = scores.filter((s) => s >= 0);
    const avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const r = await completeRoadmapSectionAction({
      lessonId,
      skill: "READING",
      score: avg,
      durationSec: totalDuration,
    });
    setFinalizing(false);
    if (r.ok) {
      toast.success(`Hoàn thành phần Đọc · ${avg}%`);
      router.push(backHref);
      router.refresh();
    } else {
      toast.error(r.error);
    }
  }

  return (
    <ReadingTestClient
      key={index}
      test={test}
      backHref={backHref}
      onSubmit={async ({ answers, durationSec }) => {
        const r = await gradeRoadmapReadingPassageAction({
          sectionId,
          passageIndex: index,
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
            : "Hoàn thành phần Đọc →"
          : `Tiếp tục đoạn ${index + 2}/${total} →`
      }
    />
  );
}
