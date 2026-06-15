"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PinyinText } from "@/components/learn/pinyin-text";
import { TestShell, QuestionNavBar } from "@/components/learn/test-shell";
import { coverChar, coverGradient, formatDuration, hskBadgeClass, hskLevelLabel, cn } from "@/lib/utils";
import { submitReadingAction } from "@/server/actions/reading";
import { Eye, EyeOff, CheckCircle2, XCircle, Languages } from "lucide-react";
import type { HSKLevel, QuestionType } from "@prisma/client";

interface Option {
  text: string;
  pinyin?: string;
}
interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  promptPinyin?: string | null;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  order: number;
}
interface Test {
  id: string;
  title: string;
  titleZh: string;
  hskLevel: HSKLevel;
  passage: string;
  passagePinyin?: string | null;
  timeLimit: number;
  questions: Question[];
}

export function ReadingTestClient({ test }: { test: Test; userId: string }) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState(0);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  async function handleSubmit() {
    if (Object.keys(answers).length < test.questions.length) {
      toast.error("Vui lòng trả lời tất cả câu hỏi trước khi nộp");
      return;
    }
    setSubmitting(true);
    const res = await submitReadingAction({ testId: test.id, answers });
    setSubmitting(false);
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
      toast.success(`Bạn đạt ${Math.round(res.result.score)}%`);
    } else {
      toast.error("Lỗi nộp bài, thử lại sau");
    }
  }

  function answer(qid: string, value: unknown) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  function jump(i: number) {
    setCurrent(i);
    questionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const answeredArr = test.questions.map((q) => answers[q.id] !== undefined);
  const correctnessArr = submitted
    ? test.questions.map((q) => result?.details[q.id])
    : undefined;
  const correctCount = result ? Object.values(result.details).filter(Boolean).length : 0;

  return (
    <TestShell
      subtitle="Đọc hiểu · Luyện tập"
      backHref="/reading"
      elapsedLabel={`${formatDuration(elapsed)} đã làm`}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitted={submitted}
      tools={
        <Button
          size="sm"
          variant={showPinyin ? "default" : "outline"}
          className="gap-1.5 rounded-lg"
          onClick={() => setShowPinyin((v) => !v)}
        >
          {showPinyin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">Pinyin</span>
        </Button>
      }
      nav={
        <QuestionNavBar
          partLabel={`${test.questions.length} câu`}
          total={test.questions.length}
          answered={answeredArr}
          current={current}
          correctness={correctnessArr}
          onJump={jump}
        />
      }
    >
      <div className="h-full overflow-y-auto lg:overflow-hidden">
        <div className="mx-auto h-full max-w-6xl lg:grid lg:grid-cols-2">
          {/* Passage */}
          <article className="p-4 sm:p-6 lg:h-full lg:overflow-y-auto lg:border-r">
            <div className={cn("relative mb-4 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br", coverGradient(test.id))}>
              <span className="font-chinese text-7xl text-white/25">{coverChar(test.id)}</span>
              <span className={cn("absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow", hskBadgeClass(test.hskLevel))}>
                {hskLevelLabel(test.hskLevel)}
              </span>
            </div>
            <h1 className="text-lg font-bold sm:text-xl">{test.title}</h1>
            <p className="font-chinese text-sm text-muted-foreground">{test.titleZh}</p>
            <div className="mt-4 font-chinese text-[15px] leading-loose">
              <PinyinText
                text={test.passage}
                showPinyin={showPinyin}
                onWordClick={(char, pinyin) => toast(`${char}`, { description: pinyin })}
              />
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Languages className="h-3.5 w-3.5" /> Nhấn vào từng chữ để xem pinyin.
            </p>
          </article>

          {/* Questions */}
          <section className="space-y-3 p-4 sm:p-6 lg:h-full lg:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-primary">Câu hỏi ({test.questions.length})</h2>
              {submitted && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                  {Math.round(result?.score ?? 0)}% · {correctCount}/{test.questions.length}
                </span>
              )}
            </div>

            {test.questions.map((q, idx) => {
              const userAnswer = answers[q.id];
              const isCorrect = submitted && result?.details[q.id];
              const correctAns = q.correctAnswer as { index?: number; value?: boolean };

              return (
                <div
                  key={q.id}
                  ref={(el) => {
                    questionRefs.current[idx] = el;
                  }}
                  onMouseDown={() => setCurrent(idx)}
                  className={cn(
                    "rounded-2xl border bg-card p-4",
                    submitted ? (isCorrect ? "border-emerald-300" : "border-rose-300") : current === idx ? "border-primary/40" : ""
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {idx + 1}
                    </span>
                    {submitted &&
                      (isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                      ))}
                    <span className="font-chinese text-sm font-semibold leading-snug">{q.prompt}</span>
                  </div>

                  {q.type === "MCQ" && (
                    <div className="mt-3 space-y-2">
                      {(q.options as Option[])?.map((opt, oi) => (
                        <button
                          key={oi}
                          onClick={() => answer(q.id, oi)}
                          disabled={submitted}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-xl border p-2.5 text-left font-chinese text-sm transition-colors",
                            userAnswer === oi
                              ? submitted
                                ? oi === correctAns.index
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-rose-400 bg-rose-50"
                                : "border-primary bg-primary/10"
                              : submitted && oi === correctAns.index
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "hover:border-primary/50"
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "TRUE_FALSE" && (
                    <div className="mt-3 flex gap-2">
                      {[true, false].map((val) => (
                        <button
                          key={String(val)}
                          onClick={() => answer(q.id, val)}
                          disabled={submitted}
                          className={cn(
                            "flex-1 rounded-xl border p-2.5 text-sm font-semibold transition-colors",
                            userAnswer === val
                              ? submitted
                                ? val === correctAns.value
                                  ? "border-emerald-500 bg-emerald-50"
                                  : "border-rose-400 bg-rose-50"
                                : "border-primary bg-primary/10"
                              : submitted && val === correctAns.value
                                ? "border-emerald-300 bg-emerald-50/50"
                                : "hover:border-primary/50"
                          )}
                        >
                          {val ? "Đúng ✓" : "Sai ✗"}
                        </button>
                      ))}
                    </div>
                  )}

                  {submitted && q.explanation && (
                    <div className="mt-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
                      💡 {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}

            {submitted && (
              <Button asChild variant="outline" className="w-full">
                <Link href="/reading">Quay lại danh sách đề</Link>
              </Button>
            )}
          </section>
        </div>
      </div>
    </TestShell>
  );
}
