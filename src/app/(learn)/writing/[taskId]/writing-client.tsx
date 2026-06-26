"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { countChineseChars, hskLevelLabel, formatDuration } from "@/lib/utils";
import { gradeWritingAction } from "@/server/actions/writing";
import { PassStatus } from "@/components/learn/roadmap/pass-status";
import { Clock, Loader2, Lightbulb, ChevronDown, CheckCircle2, ArrowUpCircle } from "lucide-react";
import type { HSKLevel, WritingTaskType } from "@prisma/client";

interface Task {
  id: string;
  taskType: WritingTaskType;
  prompt: string;
  promptZh?: string | null;
  outline?: string | null;
  imageUrl?: string | null;
  minChars: number;
  timeLimit: number;
  hskLevel: HSKLevel;
}

interface CriterionBase {
  score: number;
  feedback: string;
}
interface GradeResult {
  score: number;
  bandLabel?: string;
  criteria: {
    taskResponse?: CriterionBase;
    grammar: CriterionBase & { errors: string[] };
    vocabulary: CriterionBase & { suggestions: string[] };
    coherence: CriterionBase;
  };
  annotations: Array<{ original: string; type?: string; issue: string; correction: string; explanation: string }>;
  strengths?: string[];
  improvements?: string[];
  correctedVersion: string;
  overallFeedback: string;
}

const CRITERIA_LABELS: Record<string, string> = {
  taskResponse: "Bám sát đề 完成度",
  grammar: "Ngữ pháp 语法",
  vocabulary: "Từ vựng 词汇",
  coherence: "Mạch lạc 连贯",
};

export function WritingClient({
  task,
  onGrade,
  passThreshold,
}: {
  task: Task;
  userId?: string;
  /** Chấm bài tuỳ biến (lộ trình). Nếu có → dùng thay gradeWritingAction. */
  onGrade?: (args: {
    submission: string;
    durationSec: number;
  }) => Promise<{ ok: boolean; result?: unknown; error?: string }>;
  /** Lộ trình: ngưỡng "qua môn" để hiện nhãn Đạt/Chưa đạt trên màn kết quả. */
  passThreshold?: number;
}) {
  const [text, setText] = useState("");
  const [timeLeft, setTimeLeft] = useState(task.timeLimit);
  const [grading, setGrading] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const startTime = useRef(Date.now());

  const outlineItems = (task.outline ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
  const hasOutline = outlineItems.length > 0;

  const charCount = countChineseChars(text);
  const progress = Math.min(100, Math.round((charCount / task.minChars) * 100));

  useEffect(() => {
    if (result) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [result]);

  // Autosave
  useEffect(() => {
    const key = `writing-draft-${task.id}`;
    const saved = localStorage.getItem(key);
    if (saved) setText(saved);
  }, [task.id]);

  useEffect(() => {
    const key = `writing-draft-${task.id}`;
    const t = setTimeout(() => localStorage.setItem(key, text), 1000);
    return () => clearTimeout(t);
  }, [text, task.id]);

  async function handleGrade() {
    if (charCount < task.minChars) {
      toast.error(`Cần ít nhất ${task.minChars} chữ Hán (hiện có ${charCount})`);
      return;
    }
    setGrading(true);
    const duration = Math.round((Date.now() - startTime.current) / 1000);
    const res = onGrade
      ? await onGrade({ submission: text, durationSec: duration })
      : await gradeWritingAction({
          taskId: task.id,
          submission: text,
          durationSec: duration,
        });
    setGrading(false);
    if (res.ok && res.result) {
      setResult(res.result as GradeResult);
      localStorage.removeItem(`writing-draft-${task.id}`);
    } else {
      toast.error(res.error ?? "Lỗi chấm bài");
    }
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <BaoBuddy
          size={88}
          pose={result.score >= 60 ? "cheer" : "idle"}
          message={result.score >= 60 ? "做得好!" : "加油!"}
          className="mx-auto"
        />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Kết quả chấm bài</h2>
          <div className="flex flex-col items-end gap-1.5">
            <div className="text-4xl font-bold text-primary">{result.score}/100</div>
            {result.bandLabel && (
              <div className="text-xs font-medium text-muted-foreground">{result.bandLabel}</div>
            )}
            {passThreshold != null && <PassStatus score={result.score} threshold={passThreshold} />}
          </div>
        </div>

        {/* Criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(result.criteria ?? {}).map(([key, val]) => {
            if (!val) return null;
            return (
              <Card key={key}>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground">{CRITERIA_LABELS[key] ?? key}</div>
                  <div className="text-2xl font-bold">{val.score}</div>
                  <Progress value={val.score} className="h-1.5 mt-1" />
                  <p className="text-xs text-muted-foreground mt-2">{val.feedback}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Strengths */}
        {result.strengths && result.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" /> Điểm mạnh
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Annotations */}
        {(result.annotations?.length ?? 0) > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Lỗi cần sửa</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.annotations.map((ann, i) => (
                <div key={i} className="border rounded-lg p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    {ann.type && (
                      <Badge variant="secondary" className="font-chinese text-[10px]">{ann.type}</Badge>
                    )}
                    <span className="font-chinese text-red-600 dark:text-red-400 line-through">{ann.original}</span>
                    <span>→</span>
                    <span className="font-chinese text-green-700 dark:text-green-300 font-semibold">{ann.correction}</span>
                  </div>
                  {ann.issue && <div className="text-muted-foreground mt-1 font-medium">{ann.issue}</div>}
                  <div className="text-muted-foreground mt-1">{ann.explanation}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Improvements */}
        {result.improvements && result.improvements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-primary" /> Gợi ý cải thiện
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {result.improvements.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Corrected version */}
        <Card>
          <CardHeader><CardTitle className="text-base">Bài sửa</CardTitle></CardHeader>
          <CardContent>
            <div className="font-chinese text-sm leading-relaxed bg-green-50 dark:bg-green-500/10 rounded p-3">
              {result.correctedVersion}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Nhận xét tổng thể</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm">{result.overallFeedback}</p>
          </CardContent>
        </Card>

        <Button variant="outline" onClick={() => { setResult(null); setText(""); }}>
          Viết lại
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Bài viết</h1>
        <Badge variant={timeLeft < 120 ? "destructive" : "outline"}>
          <Clock className="h-3 w-3 mr-1" />
          {formatDuration(timeLeft)}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{hskLevelLabel(task.hskLevel)}</Badge>
          </div>
          <p className="text-sm mb-1">{task.prompt}</p>
          {task.promptZh && (
            <p className="font-chinese text-muted-foreground text-sm">{task.promptZh}</p>
          )}

          {hasOutline && (
            <div className="mt-3 border-t pt-3">
              <button
                type="button"
                onClick={() => setShowOutline((v) => !v)}
                aria-expanded={showOutline}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <Lightbulb className="h-4 w-4" />
                {showOutline ? "Ẩn dàn ý gợi ý" : "Gợi ý dàn ý"}
                <ChevronDown className={`h-4 w-4 transition-transform ${showOutline ? "rotate-180" : ""}`} />
              </button>
              {showOutline && (
                <ul className="mt-2 space-y-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                  {outlineItems.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="select-none text-amber-500 dark:text-amber-400">•</span>
                      <span className="whitespace-pre-line">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Textarea
        value={text}
        onChange={(e) => !isComposing && setText(e.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={(e) => {
          setIsComposing(false);
          setText((e.target as HTMLTextAreaElement).value);
        }}
        className="min-h-48 font-chinese text-base"
        placeholder="Viết bài của bạn ở đây..."
        disabled={grading}
      />

      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1 mr-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{charCount} chữ Hán</span>
            <span>Tối thiểu: {task.minChars}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Button onClick={handleGrade} disabled={grading || charCount < task.minChars}>
          {grading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang chấm...</>
          ) : "Nộp & Chấm bài"}
        </Button>
      </div>
    </div>
  );
}
