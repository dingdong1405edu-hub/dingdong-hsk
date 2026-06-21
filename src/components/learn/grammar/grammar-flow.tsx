"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { completeLessonAction } from "@/server/actions/lesson";
import { SectionTheory } from "./section-theory";
import { FlashcardPhase, type FlashResult } from "./flashcard-phase";
import { GrammarTestRunner, type TestResult } from "./grammar-test-runner";
import { TheoryReviewDialog } from "./theory-review-dialog";
import type { GrammarLessonContent, GrammarSection } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  content: GrammarLessonContent;
  unitId: string;
}

type Stage = "theory" | "practice" | "test" | "done";

/** A section is worth a theory screen if it has any teaching content. */
function sectionHasTheory(s: GrammarSection): boolean {
  return Boolean(s.structure || s.explanation || s.examples.length || s.imageUrl);
}
function sectionHasPractice(s: GrammarSection): boolean {
  return s.exercises.length > 0;
}

/**
 * Grammar lesson orchestrator. Interleaved flow: for each section the learner
 * studies its theory then immediately drills that section's exercises, before
 * moving to the next section — then one comprehensive test, then the summary.
 * Scoring: flashcard skips are excluded from the denominator; the test alone
 * decides whether the lesson is marked completed (≥ passThreshold%, default 60).
 */
export function GrammarFlow({ lesson, content, unitId }: Props) {
  const router = useRouter();
  const sections = content.sections;
  const hasTest = content.test.questions.length > 0;
  const passThreshold = content.test.passThreshold ?? 60;
  const closeHref = `/grammar/${unitId}`;

  const theorySections = sections.filter(sectionHasTheory);
  const firstIdx = sections.findIndex((s) => sectionHasTheory(s) || sectionHasPractice(s));
  const hasAnyContent = firstIdx !== -1 || hasTest;
  const startIdx = firstIdx === -1 ? sections.length : firstIdx;
  const startStage: Stage =
    firstIdx === -1 ? "test" : sectionHasTheory(sections[firstIdx]) ? "theory" : "practice";
  const totalSegments = sections.length + (hasTest ? 1 : 0);

  const [stage, setStage] = useState<Stage>(startStage);
  const [sectionIndex, setSectionIndex] = useState(startIdx);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const flashRef = useRef<FlashResult>({ correct: 0, wrong: 0, skipped: 0 });
  const [startTime] = useState(Date.now());

  // Empty lesson — nothing authored yet.
  if (!hasAnyContent) {
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
    // Round identically to the summary screen so the % and the completed/locked
    // decision can never disagree at the threshold boundary.
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
    setStage("done");
  }

  // Advance to the next section that has content, else the test, else finish.
  function goToSection(from: number) {
    let n = from;
    while (n < sections.length && !sectionHasTheory(sections[n]) && !sectionHasPractice(sections[n])) {
      n++;
    }
    if (n < sections.length) {
      setSectionIndex(n);
      setStage(sectionHasTheory(sections[n]) ? "theory" : "practice");
    } else if (hasTest) {
      setStage("test");
    } else {
      finishLesson(flashRef.current, null);
    }
  }

  function handleTheoryContinue() {
    if (sectionHasPractice(sections[sectionIndex])) setStage("practice");
    else goToSection(sectionIndex + 1);
  }

  function handlePracticeDone(result: FlashResult) {
    flashRef.current = {
      correct: flashRef.current.correct + result.correct,
      wrong: flashRef.current.wrong + result.wrong,
      skipped: flashRef.current.skipped + result.skipped,
    };
    goToSection(sectionIndex + 1);
  }

  function handleTestDone(result: TestResult) {
    setTest(result);
    finishLesson(flashRef.current, result);
  }

  function retryTest() {
    setTest(null);
    setXpEarned(null);
    setStage("test");
  }

  if (stage === "done") {
    const flash = flashRef.current;
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
                <div className={`text-4xl font-bold ${passed ? "text-primary" : "text-red-600"}`}>
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
                <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
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

  const reviewBtn = theorySections.length ? () => setReviewOpen(true) : undefined;

  return (
    <>
      {stage === "theory" && (
        <SectionTheory
          section={sections[sectionIndex]}
          sectionIndex={sectionIndex}
          sectionCount={sections.length}
          progress={Math.round((sectionIndex / Math.max(1, totalSegments)) * 100)}
          closeHref={closeHref}
          ctaLabel={
            sectionHasPractice(sections[sectionIndex]) ? "Luyện tập phần này" : "Tiếp tục"
          }
          onReviewTheory={reviewBtn}
          onContinue={handleTheoryContinue}
        />
      )}

      {stage === "practice" && (
        <FlashcardPhase
          flashcards={sections[sectionIndex].exercises}
          closeHref={closeHref}
          label={`Phần ${sectionIndex + 1}/${sections.length}`}
          onReviewTheory={reviewBtn}
          onDone={handlePracticeDone}
        />
      )}

      {stage === "test" && (
        <GrammarTestRunner
          test={content.test}
          closeHref={closeHref}
          onReviewTheory={reviewBtn}
          onDone={handleTestDone}
        />
      )}

      {theorySections.length > 0 && (
        <TheoryReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          sections={theorySections}
        />
      )}
    </>
  );
}
