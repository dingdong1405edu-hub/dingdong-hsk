"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeLessonAction } from "@/server/actions/lesson";
import { TheoryPass } from "./theory-pass";
import { FlashcardPhase, type FlashResult } from "./flashcard-phase";
import { GrammarTestRunner, type TestResult } from "./grammar-test-runner";
import { TheoryReviewDialog } from "./theory-review-dialog";
import type { GrammarLessonContent } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  content: GrammarLessonContent;
  unitId: string;
}

type Phase = "theory" | "flashcards" | "test" | "done";

/**
 * Grammar lesson orchestrator: theory (single pass, reviewable any time) →
 * flashcards (skippable, risk-free) → comprehensive test → summary. Scoring:
 * flashcard skips are excluded from the denominator; the test alone decides
 * whether the lesson is marked completed (≥ passThreshold%, default 60).
 */
export function GrammarFlow({ lesson, content, unitId }: Props) {
  const router = useRouter();
  const hasTheory = content.theory.length > 0;
  const hasFlashcards = content.flashcards.length > 0;
  const hasTest = content.test.questions.length > 0;
  const passThreshold = content.test.passThreshold ?? 60;
  const closeHref = `/grammar/${unitId}`;

  const initialPhase: Phase = hasTheory
    ? "theory"
    : hasFlashcards
      ? "flashcards"
      : hasTest
        ? "test"
        : "done";

  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [flash, setFlash] = useState<FlashResult>({ correct: 0, wrong: 0, skipped: 0 });
  const [test, setTest] = useState<TestResult | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  // Empty lesson — nothing authored yet.
  if (!hasTheory && !hasFlashcards && !hasTest) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">📭</div>
        <h2 className="text-xl font-bold">Bài học chưa có nội dung</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Phần ngữ pháp này đang được biên soạn. Hãy quay lại sau nhé!
        </p>
        <Link href={closeHref}>
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>
    );
  }

  async function finishLesson(flashResult: FlashResult, testResult: TestResult | null) {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    const tCorrect = testResult?.correct ?? 0;
    const tTotal = testResult?.total ?? 0;
    // Skipped flashcards are excluded from the denominator: skipping an unsuited
    // exercise neither helps nor hurts. The test contributes both ways.
    const correct = flashResult.correct + tCorrect;
    const total = Math.max(1, flashResult.correct + flashResult.wrong + tTotal);
    // Pass gate = the comprehensive test only. No test authored → auto-pass.
    // Round identically to the summary screen so the displayed % and the
    // completed/locked decision can never disagree at the threshold boundary.
    const passed = tTotal === 0 ? true : Math.round((tCorrect / tTotal) * 100) >= passThreshold;
    const res = await completeLessonAction({
      lessonId: lesson.id,
      skill: "grammar",
      correct,
      total,
      heartsLost: 0,
      durationSec,
      completed: passed,
    });
    if (res.ok) {
      setXpEarned(res.xpEarned ?? 0);
    } else {
      toast.error("Lỗi lưu kết quả");
      setXpEarned(0);
    }
    setPhase("done");
  }

  function handleTheoryDone() {
    if (hasFlashcards) setPhase("flashcards");
    else if (hasTest) setPhase("test");
    else finishLesson({ correct: 0, wrong: 0, skipped: 0 }, null);
  }

  function handleFlashDone(result: FlashResult) {
    setFlash(result);
    if (hasTest) setPhase("test");
    else finishLesson(result, null);
  }

  function handleTestDone(result: TestResult) {
    setTest(result);
    finishLesson(flash, result);
  }

  function retryTest() {
    setTest(null);
    setXpEarned(null);
    setPhase("test");
  }

  if (phase === "done") {
    const testCorrect = test?.correct ?? 0;
    const testTotal = test?.total ?? 0;
    const testPct = testTotal > 0 ? Math.round((testCorrect / testTotal) * 100) : null;
    const passed = testPct === null ? true : testPct >= passThreshold;
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <div className="text-6xl">{passed ? "🎉" : "📚"}</div>
            <h2 className="text-2xl font-bold">
              {passed ? "Hoàn thành bài học!" : "Chưa đạt, thử lại nhé!"}
            </h2>

            {testPct !== null ? (
              <>
                <div
                  className={`text-4xl font-bold ${passed ? "text-primary" : "text-red-600"}`}
                >
                  {testPct}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Bài kiểm tra: {testCorrect}/{testTotal} câu đúng · cần ≥ {passThreshold}%
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bạn đã hoàn thành bài “{lesson.title || "Ngữ pháp"}”.
              </p>
            )}

            {(flash.correct > 0 || flash.wrong > 0 || flash.skipped > 0) && (
              <div className="text-xs text-muted-foreground">
                Luyện tập: {flash.correct} đúng · {flash.wrong} sai · {flash.skipped} bỏ qua
              </div>
            )}

            {xpEarned !== null && xpEarned > 0 && (
              <div className="font-semibold text-yellow-600">+{xpEarned} XP</div>
            )}

            <div className="flex gap-2 pt-2">
              {!passed && hasTest ? (
                <Button variant="outline" className="flex-1" onClick={retryTest}>
                  Làm lại bài test
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Học lại
                </Button>
              )}
              <Button className="flex-1" onClick={() => router.push(closeHref)}>
                Tiếp tục
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reviewBtn = hasTheory ? () => setReviewOpen(true) : undefined;

  return (
    <>
      {phase === "theory" && (
        <TheoryPass sections={content.theory} closeHref={closeHref} onDone={handleTheoryDone} />
      )}
      {phase === "flashcards" && (
        <FlashcardPhase
          flashcards={content.flashcards}
          closeHref={closeHref}
          onReviewTheory={reviewBtn}
          onDone={handleFlashDone}
        />
      )}
      {phase === "test" && (
        <GrammarTestRunner
          test={content.test}
          closeHref={closeHref}
          onReviewTheory={reviewBtn}
          onDone={handleTestDone}
        />
      )}
      {hasTheory && (
        <TheoryReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          sections={content.theory}
        />
      )}
    </>
  );
}
