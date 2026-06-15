"use client";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TestShell, QuestionNavBar } from "@/components/learn/test-shell";
import { formatDuration, hskBadgeClass, hskLevelLabel, cn } from "@/lib/utils";
import { submitListeningAction } from "@/server/actions/listening";
import { Play, Pause, Volume2, Eye, CheckCircle2, XCircle } from "lucide-react";
import type { HSKLevel, QuestionType } from "@prisma/client";

interface Option { text: string; pinyin?: string }
interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
}
interface Test {
  id: string;
  title: string;
  hskLevel: HSKLevel;
  audioUrl: string;
  transcript?: string | null;
  timeLimit: number;
  questions: Question[];
}

export function ListeningTestClient({ test }: { test: Test; userId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState(0);

  const maxPlays = test.hskLevel === "HSK1" || test.hskLevel === "HSK2" ? 3 : 2;

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      if (playCount >= maxPlays) {
        toast.error(`Giới hạn ${maxPlays} lần nghe`);
        return;
      }
      audioRef.current.play();
      setPlayCount((c) => c + 1);
    }
    setPlaying(!playing);
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  async function handleSubmit() {
    if (test.questions.length > 0 && Object.keys(answers).length < test.questions.length) {
      toast.error("Hãy trả lời tất cả câu hỏi trước khi nộp");
      return;
    }
    setSubmitting(true);
    const res = await submitListeningAction({ testId: test.id, answers });
    setSubmitting(false);
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
      toast.success(`Bạn đạt ${Math.round(res.result.score)}%`);
    } else {
      toast.error("Lỗi nộp bài");
    }
  }

  function jump(i: number) {
    setCurrent(i);
    questionRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const answeredArr = test.questions.map((q) => answers[q.id] !== undefined);
  const correctnessArr = submitted ? test.questions.map((q) => result?.details[q.id]) : undefined;
  const correctCount = result ? Object.values(result.details).filter(Boolean).length : 0;

  return (
    <TestShell
      subtitle="Nghe hiểu · Luyện tập"
      backHref="/listening"
      elapsedLabel={`${formatDuration(elapsed)} đã làm`}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitted={submitted}
      nav={
        test.questions.length > 0 ? (
          <QuestionNavBar
            partLabel={`${test.questions.length} câu`}
            total={test.questions.length}
            answered={answeredArr}
            current={current}
            correctness={correctnessArr}
            onJump={jump}
          />
        ) : undefined
      }
    >
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold sm:text-xl">{test.title}</h1>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", hskBadgeClass(test.hskLevel))}>
              {hskLevelLabel(test.hskLevel)}
            </span>
          </div>

          {/* Audio player */}
          <div className="rounded-2xl border bg-card p-4">
            <audio
              ref={audioRef}
              src={test.audioUrl}
              onEnded={() => setPlaying(false)}
              onError={() => {
                setAudioError(true);
                setPlaying(false);
              }}
            />
            {audioError && (
              <p className="mb-2 text-xs text-muted-foreground">
                Không tải được audio. Bạn vẫn có thể trả lời câu hỏi; transcript sẽ hiện sau khi nộp.
              </p>
            )}
            <div className="flex items-center gap-4">
              <Button size="icon" variant="outline" onClick={togglePlay} disabled={playCount >= maxPlays && !playing}>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
                <Volume2 className="h-4 w-4" /> {playCount}/{maxPlays} lần nghe
              </div>
              <div className="flex items-center gap-1">
                {[0.75, 1, 1.25, 1.5].map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={speed === s ? "default" : "outline"}
                    className="h-7 px-2 text-xs"
                    onClick={() => changeSpeed(s)}
                  >
                    {s}x
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
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
                          onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: oi }))}
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
                          onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: val }))}
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
                    <div className="mt-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">💡 {q.explanation}</div>
                  )}
                </div>
              );
            })}
          </div>

          {submitted && test.transcript && (
            <div className="space-y-3">
              <Button variant="outline" className="w-full" onClick={() => setShowTranscript((v) => !v)}>
                <Eye className="mr-2 h-4 w-4" /> {showTranscript ? "Ẩn" : "Xem"} transcript
              </Button>
              {showTranscript && (
                <div className="rounded-2xl border bg-card p-4">
                  <pre className="whitespace-pre-wrap font-chinese text-sm">{test.transcript}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TestShell>
  );
}
