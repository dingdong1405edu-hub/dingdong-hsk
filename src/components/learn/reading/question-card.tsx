"use client";
import { CheckCircle2, XCircle, Flag } from "lucide-react";
import { PinyinText } from "@/components/learn/pinyin-text";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ReadingOption, ReadingQuestion } from "./types";

interface QuestionCardProps {
  question: ReadingQuestion;
  index: number;
  userAnswer: unknown;
  onAnswer: (value: unknown) => void;
  submitted: boolean;
  isCorrect?: boolean;
  flagged: boolean;
  onToggleFlag: () => void;
  showPinyin: boolean;
  isCurrent: boolean;
  onActivate: () => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

export function QuestionCard({
  question: q,
  index,
  userAnswer,
  onAnswer,
  submitted,
  isCorrect,
  flagged,
  onToggleFlag,
  showPinyin,
  isCurrent,
  onActivate,
  cardRef,
}: QuestionCardProps) {
  const ca = q.correctAnswer as { index?: number; value?: boolean; text?: string; accepted?: string[] };
  const correctText = ca.text ?? ca.accepted?.[0];

  return (
    <div
      ref={cardRef}
      onMouseDown={onActivate}
      className={cn(
        "relative rounded-2xl border bg-card p-4 pl-5 transition-colors",
        submitted
          ? isCorrect
            ? "border-emerald-300"
            : "border-rose-300"
          : isCurrent
            ? "border-primary/50"
            : "border-border",
      )}
    >
      {/* current/flagged accent bar */}
      <span
        className={cn(
          "absolute inset-y-3 left-0 w-1 rounded-full transition-colors",
          submitted
            ? isCorrect
              ? "bg-emerald-400"
              : "bg-rose-400"
            : flagged
              ? "bg-amber-400"
              : isCurrent
                ? "bg-primary"
                : "bg-transparent",
        )}
      />

      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {index + 1}
        </span>
        {submitted &&
          (isCorrect ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
          ))}
        <div className="min-w-0 flex-1 font-chinese text-sm font-semibold leading-snug">
          <PinyinText text={q.prompt} showPinyin={showPinyin} />
        </div>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-label={flagged ? "Bỏ gắn cờ" : "Gắn cờ xem lại"}
          className={cn(
            "shrink-0 rounded-lg border p-1.5 transition-colors",
            flagged
              ? "border-amber-400 bg-amber-50 text-amber-600"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          <Flag className={cn("h-4 w-4", flagged && "fill-amber-400")} />
        </button>
      </div>

      {/* MCQ */}
      {q.type === "MCQ" && (
        <div className="mt-3 space-y-2">
          {(q.options as ReadingOption[])?.map((opt, oi) => (
            <button
              key={oi}
              onClick={() => onAnswer(oi)}
              disabled={submitted}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border p-2.5 text-left font-chinese text-sm transition-colors",
                userAnswer === oi
                  ? submitted
                    ? oi === ca.index
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-rose-400 bg-rose-50"
                    : "border-primary bg-primary/10"
                  : submitted && oi === ca.index
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "hover:border-primary/50",
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

      {/* True / False */}
      {q.type === "TRUE_FALSE" && (
        <div className="mt-3 flex gap-2">
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => onAnswer(val)}
              disabled={submitted}
              className={cn(
                "flex-1 rounded-xl border p-2.5 text-sm font-semibold transition-colors",
                userAnswer === val
                  ? submitted
                    ? val === ca.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-rose-400 bg-rose-50"
                    : "border-primary bg-primary/10"
                  : submitted && val === ca.value
                    ? "border-emerald-300 bg-emerald-50/50"
                    : "hover:border-primary/50",
              )}
            >
              {val ? "Đúng ✓" : "Sai ✗"}
            </button>
          ))}
        </div>
      )}

      {/* Fill-in / short answer */}
      {(q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") && (
        <div className="mt-3 space-y-2">
          <Input
            value={(userAnswer as string) ?? ""}
            onChange={(e) => onAnswer(e.target.value)}
            disabled={submitted}
            placeholder="Nhập câu trả lời…"
            className={cn(
              "font-chinese",
              submitted && (isCorrect ? "border-emerald-400 bg-emerald-50" : "border-rose-300 bg-rose-50"),
            )}
          />
          {submitted && !isCorrect && correctText && (
            <p className="text-xs text-emerald-700">
              Đáp án đúng: <span className="font-chinese font-semibold">{correctText}</span>
            </p>
          )}
        </div>
      )}

      {/* Unsupported types degrade gracefully instead of blocking */}
      {q.type === "MATCHING" && (
        <p className="mt-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">
          Loại câu hỏi nối chưa được hỗ trợ trong phiên bản này.
        </p>
      )}

      {submitted && q.supportingQuote && (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <span className="font-semibold">📍 Đáp án nằm ở đoạn:</span>{" "}
          <span className="font-chinese">{q.supportingQuote}</span>
        </div>
      )}
      {submitted && q.explanation && (
        <div className="mt-2 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">💡 {q.explanation}</div>
      )}
    </div>
  );
}
