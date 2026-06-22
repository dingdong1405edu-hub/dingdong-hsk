"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GrammarTestRunner, type TestResult } from "./grammar-test-runner";
import { submitGrammarTestAction } from "@/server/actions/lesson";
import { describeExercise } from "@/lib/grammar";
import { cn } from "@/lib/utils";
import type { GrammarLessonContent } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  content: GrammarLessonContent;
  unitId: string;
}

const PASS = 80;

type Stage = "intro" | "running" | "result";

interface Outcome {
  result: TestResult;
  passed: boolean;
  pct: number;
  xpEarned: number;
  alreadyAwarded: boolean;
}

/**
 * Bài kiểm tra ngữ pháp — TÁCH RIÊNG khỏi luồng học. Làm xong sẽ CHẤM và hiện đáp
 * án + chỉ rõ câu sai cho từng câu. Chỉ đạt ≥ 80% mới được điểm kinh nghiệm; làm
 * bài kiểm tra KHÔNG bắt buộc để mở khoá bài tiếp theo.
 */
export function GrammarTestFlow({ lesson, content, unitId }: Props) {
  const router = useRouter();
  const questions = content.test.questions;
  const closeHref = `/grammar/${unitId}`;
  const [stage, setStage] = useState<Stage>("intro");
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">📝</div>
        <h2 className="text-xl font-bold">Bài này chưa có bài kiểm tra</h2>
        <Button variant="outline" onClick={() => router.push(closeHref)}>
          Quay lại
        </Button>
      </div>
    );
  }

  async function handleDone(result: TestResult) {
    setSubmitting(true);
    const res = await submitGrammarTestAction({
      lessonId: lesson.id,
      correct: result.correct,
      total: result.total,
    });
    setSubmitting(false);
    const pct = Math.round((result.correct / Math.max(1, result.total)) * 100);
    if (res.ok) {
      setOutcome({
        result,
        passed: res.passed ?? pct >= PASS,
        pct: res.pct ?? pct,
        xpEarned: res.xpEarned ?? 0,
        alreadyAwarded: res.alreadyAwarded ?? false,
      });
    } else {
      toast.error("Lỗi lưu kết quả");
      setOutcome({ result, passed: pct >= PASS, pct, xpEarned: 0, alreadyAwarded: false });
    }
    setStage("result");
  }

  function retake() {
    setOutcome(null);
    setAttempt((a) => a + 1);
    setStage("running");
  }

  if (stage === "intro") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <ClipboardCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold">Bài kiểm tra</h2>
            <p className="text-sm text-muted-foreground">{lesson.title || "Ngữ pháp"}</p>
            <div className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              {questions.length} câu · Đạt <b>≥ {PASS}%</b> để nhận điểm kinh nghiệm. Chấm xong sẽ hiện đáp án và chỉ
              rõ câu sai.
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => router.push(closeHref)}>
                Quay lại
              </Button>
              <Button className="flex-1" onClick={() => setStage("running")}>
                Bắt đầu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "running") {
    return (
      <GrammarTestRunner key={attempt} test={content.test} closeHref={closeHref} onDone={handleDone} />
    );
  }

  // stage === "result"
  if (!outcome) return null;
  const { result, passed, pct, xpEarned, alreadyAwarded } = outcome;
  return (
    <div className="mx-auto max-w-2xl space-y-5 py-6">
      <Card className="text-center">
        <CardContent className="space-y-3 px-6 pb-6 pt-8">
          <div className="text-6xl">{passed ? "🏆" : "📚"}</div>
          <h2 className="text-2xl font-bold">{passed ? "Đạt rồi!" : "Chưa đạt, thử lại nhé!"}</h2>
          <div className={cn("text-4xl font-bold", passed ? "text-primary" : "text-red-600")}>{pct}%</div>
          <div className="text-sm text-muted-foreground">
            {result.correct}/{result.total} câu đúng · cần ≥ {PASS}%
          </div>
          {passed && xpEarned > 0 && (
            <div className="inline-flex items-center gap-1.5 font-semibold text-yellow-600">
              <Trophy className="h-4 w-4" /> +{xpEarned} XP
            </div>
          )}
          {passed && xpEarned === 0 && alreadyAwarded && (
            <div className="text-xs text-muted-foreground">Bạn đã nhận điểm kinh nghiệm của bài này trước đó.</div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 gap-1.5" onClick={retake}>
              <RotateCcw className="h-4 w-4" /> Làm lại
            </Button>
            <Button className="flex-1" onClick={() => router.push(closeHref)}>
              Quay lại danh sách
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chữa bài — đáp án + chỉ câu sai */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-muted-foreground">Chữa bài</h3>
        {questions.map((q, i) => {
          const d = describeExercise(q);
          const ok = result.results[i] === true;
          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl border p-4",
                ok ? "border-emerald-300 bg-emerald-50/40" : "border-rose-300 bg-rose-50/40",
              )}
            >
              <div className="flex items-start gap-2">
                {ok ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Câu {i + 1} · {d.typeLabel}
                  </div>
                  <div className="font-chinese text-sm">{d.question}</div>
                  {d.questionPinyin && <div className="font-pinyin text-xs text-muted-foreground">{d.questionPinyin}</div>}
                  <div className="mt-1.5 text-sm">
                    <span className="font-semibold text-emerald-700">Đáp án: </span>
                    <span className="font-chinese">{d.answer}</span>
                  </div>
                  {d.explanation && (
                    <div className="mt-0.5 text-xs text-muted-foreground">💡 {d.explanation}</div>
                  )}
                  {!ok && (
                    <div className="mt-1 text-xs font-medium text-rose-600">
                      Bạn trả lời {result.results[i] === undefined ? "chưa kịp / bỏ trống" : "chưa đúng"}.
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {submitting && <p className="text-center text-xs text-muted-foreground">Đang lưu…</p>}
    </div>
  );
}
