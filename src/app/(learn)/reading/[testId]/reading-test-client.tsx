"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PinyinText } from "@/components/learn/pinyin-text";
import { formatDuration, hskLevelLabel } from "@/lib/utils";
import { submitReadingAction } from "@/server/actions/reading";
import { Clock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
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

interface Props {
  test: Test;
  userId: string;
}

export function ReadingTestClient({ test, userId }: Props) {
  const [showPinyin, setShowPinyin] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [timeLeft, setTimeLeft] = useState(test.timeLimit);

  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [submitted]);

  async function handleSubmit() {
    if (Object.keys(answers).length < test.questions.length) {
      toast.error("Vui lòng trả lời tất cả câu hỏi");
      return;
    }
    const res = await submitReadingAction({ testId: test.id, answers });
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
    } else {
      toast.error("Lỗi nộp bài");
    }
  }

  function handleAnswer(questionId: string, value: unknown) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
      {/* Passage */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{test.title}</h1>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPinyin(!showPinyin)}
            >
              {showPinyin ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              Pinyin
            </Button>
            <Badge variant="outline" className={timeLeft < 60 ? "text-red-500 border-red-400" : ""}>
              <Clock className="h-3 w-3 mr-1" />
              {formatDuration(timeLeft)}
            </Badge>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="font-chinese text-base leading-relaxed">
              <PinyinText text={test.passage} showPinyin={showPinyin} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Câu hỏi ({test.questions.length})</h2>
        {test.questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = submitted && result?.details[q.id];
          const correctAns = q.correctAnswer as { index?: number; value?: boolean; text?: string };

          return (
            <Card key={q.id} className={submitted ? (isCorrect ? "border-green-300" : "border-red-300") : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  {submitted && (
                    isCorrect
                      ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      : <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="font-semibold text-sm">
                    {idx + 1}. <span className="font-chinese">{q.prompt}</span>
                  </div>
                </div>

                {q.type === "MCQ" && (q.options as Option[])?.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => handleAnswer(q.id, oi)}
                    disabled={submitted}
                    className={`w-full text-left p-2 rounded border text-sm font-chinese transition-colors ${
                      userAnswer === oi
                        ? submitted
                          ? oi === correctAns.index
                            ? "border-green-500 bg-green-50"
                            : "border-red-400 bg-red-50"
                          : "border-primary bg-primary/10"
                        : submitted && oi === correctAns.index
                          ? "border-green-300 bg-green-50/50"
                          : "hover:border-primary/50"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt.text}
                  </button>
                ))}

                {q.type === "TRUE_FALSE" && (
                  <div className="flex gap-2">
                    {[true, false].map((val) => (
                      <button
                        key={String(val)}
                        onClick={() => handleAnswer(q.id, val)}
                        disabled={submitted}
                        className={`flex-1 p-2 rounded border text-sm font-semibold transition-colors ${
                          userAnswer === val
                            ? "border-primary bg-primary/10"
                            : "hover:border-primary/50"
                        }`}
                      >
                        {val ? "Đúng ✓" : "Sai ✗"}
                      </button>
                    ))}
                  </div>
                )}

                {submitted && q.explanation && (
                  <div className="text-xs text-muted-foreground bg-muted rounded p-2">
                    💡 {q.explanation}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!submitted ? (
          <Button className="w-full" onClick={handleSubmit}>
            Nộp bài
          </Button>
        ) : (
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="text-4xl font-bold text-primary mb-2">
                {Math.round(result?.score ?? 0)}%
              </div>
              <div className="text-muted-foreground text-sm">
                {Object.values(result?.details ?? {}).filter(Boolean).length} / {test.questions.length} câu đúng
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
