"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { completeLessonAction } from "@/server/actions/lesson";
import { SectionTheory } from "./section-theory";
import { FlashcardPhase, type FlashResult } from "./flashcard-phase";
import { TheoryReviewDialog } from "./theory-review-dialog";
import { PassStatus } from "@/components/learn/roadmap/pass-status";
import type { GrammarLessonContent, GrammarSection } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  content: GrammarLessonContent;
  unitId: string;
  /** Ghi hoàn thành tuỳ biến (lộ trình). Nếu có → dùng thay completeLessonAction. */
  onComplete?: (stats: { correct: number; total: number; durationSec: number }) => Promise<{ ok: boolean }>;
  /** Đường dẫn nút "Quay lại" (mặc định về unit Luyện kỹ năng). */
  closeHref?: string;
  /** Hiển thị nút "Làm bài kiểm tra" (mặc định true; lộ trình tắt vì không có trang test riêng). */
  showTest?: boolean;
  /** Lộ trình: ngưỡng "qua môn" → hiện kết quả % + nhãn Đạt/Chưa đạt ở màn hoàn thành. */
  passThreshold?: number;
}

type Stage = "theory" | "practice" | "done";

/** A section is worth a theory screen if it has any teaching content. */
function sectionHasTheory(s: GrammarSection): boolean {
  return Boolean(s.structure || s.explanation || s.examples.length || s.imageUrl);
}
function sectionHasPractice(s: GrammarSection): boolean {
  return s.exercises.length > 0;
}

/**
 * Grammar lesson orchestrator — chỉ HỌC: với mỗi phần, học viên xem lý thuyết rồi
 * luyện tập (minigame), sang phần kế, cho tới hết. Hoàn thành luyện tập sẽ mở khoá
 * bài tiếp theo (KHÔNG cần làm bài kiểm tra). Bài kiểm tra được TÁCH RIÊNG sang
 * trang .../test (nút "Làm bài kiểm tra"); chỉ ở đó mới có điểm kinh nghiệm.
 */
export function GrammarFlow({ lesson, content, unitId, onComplete, closeHref: closeHrefProp, showTest = true, passThreshold }: Props) {
  const router = useRouter();
  const sections = content.sections;
  const hasTest = showTest && content.test.questions.length > 0;
  const closeHref = closeHrefProp ?? `/grammar/${unitId}`;
  const testHref = `/grammar/${unitId}/lesson/${lesson.id}/test`;

  const theorySections = sections.filter(sectionHasTheory);
  const firstIdx = sections.findIndex((s) => sectionHasTheory(s) || sectionHasPractice(s));
  const hasSectionContent = firstIdx !== -1;
  const hasAnyContent = hasSectionContent || hasTest;
  const startIdx = hasSectionContent ? firstIdx : 0;
  const startStage: Stage = !hasSectionContent
    ? "done"
    : sectionHasTheory(sections[firstIdx])
      ? "theory"
      : "practice";
  const totalSegments = Math.max(1, sections.length);

  const [stage, setStage] = useState<Stage>(startStage);
  const [sectionIndex, setSectionIndex] = useState(startIdx);
  const [reviewOpen, setReviewOpen] = useState(false);
  const flashRef = useRef<FlashResult>({ correct: 0, wrong: 0, skipped: 0 });
  const [startTime] = useState(Date.now());
  const [resultPct, setResultPct] = useState<number | null>(null);
  const savedRef = useRef(false);

  // Bài chỉ có bài kiểm tra (không phần lý thuyết/luyện tập) → đánh dấu hoàn thành
  // ngay để mở khoá, rồi hiện màn hình dẫn tới bài kiểm tra.
  useEffect(() => {
    if (hasAnyContent && !hasSectionContent) void finishLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty lesson — nothing authored yet.
  if (!hasAnyContent) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BaoBuddy size={88} pose="idle" className="mx-auto" />
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

  async function finishLesson() {
    if (savedRef.current) return;
    savedRef.current = true;
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    const correct = flashRef.current.correct;
    const graded = flashRef.current.correct + flashRef.current.wrong;
    const total = Math.max(1, graded);
    // Chỉ có % "qua môn" khi thực sự có câu luyện tập (bài chỉ-lý-thuyết thì không chấm).
    setResultPct(graded > 0 ? Math.round((correct / total) * 100) : null);
    // Hoàn thành luyện tập → mở khoá bài kế; KHÔNG cộng XP (XP chỉ từ bài kiểm tra).
    const res = onComplete
      ? await onComplete({ correct, total, durationSec })
      : await completeLessonAction({
          lessonId: lesson.id,
          skill: "grammar",
          correct,
          total,
          heartsLost: 0,
          durationSec,
          completed: true,
          awardXp: false,
        });
    if (!res.ok) toast.error("Lỗi lưu kết quả");
    setStage("done");
  }

  // Advance to the next section that has content, else finish (no test in flow).
  function goToSection(from: number) {
    let n = from;
    while (n < sections.length && !sectionHasTheory(sections[n]) && !sectionHasPractice(sections[n])) {
      n++;
    }
    if (n < sections.length) {
      setSectionIndex(n);
      setStage(sectionHasTheory(sections[n]) ? "theory" : "practice");
    } else {
      void finishLesson();
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

  if (stage === "done") {
    const flash = flashRef.current;
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <BaoBuddy size={104} pose="cheer" message="做得好!" className="mx-auto" />
            <h2 className="text-2xl font-bold">Đã học xong bài!</h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã hoàn thành bài “{lesson.title || "Ngữ pháp"}”. Bài tiếp theo đã được mở khoá.
            </p>

            {passThreshold != null && resultPct != null && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-3xl font-extrabold text-primary">Kết quả: {resultPct}%</div>
                <PassStatus score={resultPct} threshold={passThreshold} />
              </div>
            )}

            {(flash.correct > 0 || flash.wrong > 0 || flash.skipped > 0) && (
              <div className="text-xs text-muted-foreground">
                Luyện tập: {flash.correct} đúng · {flash.wrong} sai · {flash.skipped} bỏ qua
              </div>
            )}

            {hasTest && (
              <div className="rounded-xl bg-violet-50 dark:bg-violet-500/15 p-3 text-sm text-violet-800 dark:text-violet-200">
                Làm <b>bài kiểm tra</b> để kiểm tra lại và nhận điểm kinh nghiệm (cần đạt ≥ 80%).
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              {hasTest && (
                <Button className="w-full gap-1.5" onClick={() => router.push(testHref)}>
                  <ClipboardCheck className="h-4 w-4" /> Làm bài kiểm tra
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                  Học lại
                </Button>
                <Button variant={hasTest ? "outline" : "default"} className="flex-1" onClick={() => router.push(closeHref)}>
                  Quay lại danh sách
                </Button>
              </div>
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
          progress={Math.round((sectionIndex / totalSegments) * 100)}
          closeHref={closeHref}
          ctaLabel={sectionHasPractice(sections[sectionIndex]) ? "Luyện tập phần này" : "Tiếp tục"}
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

      {theorySections.length > 0 && (
        <TheoryReviewDialog open={reviewOpen} onOpenChange={setReviewOpen} sections={theorySections} />
      )}
    </>
  );
}
