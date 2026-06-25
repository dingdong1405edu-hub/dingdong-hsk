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
  /** Tô sáng + cuộn tới chỗ chứa đáp án trong đoạn văn (chỉ dùng khi đã nộp). */
  onShowEvidence?: () => void;
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
  onShowEvidence,
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
            ? "border-emerald-300 dark:border-emerald-500/40"
            : "border-rose-300 dark:border-rose-500/40"
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
              ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
              : "border-transparent text-muted-foreground hover:bg-muted",
          )}
        >
          <Flag className={cn("h-4 w-4", flagged && "fill-amber-400")} />
        </button>
      </div>

      {/* Câu hỏi dịch (khi chữa bài) */}
      {submitted && q.promptTranslation && (
        <p className="mt-1.5 pl-8 text-xs italic text-muted-foreground">{q.promptTranslation}</p>
      )}

      {/* MCQ */}
      {q.type === "MCQ" && (
        <div className="mt-3 space-y-2">
          {(q.options as ReadingOption[])?.map((opt, oi) => (
            <button
              key={oi}
              onClick={() => onAnswer(oi)}
              disabled={submitted}
              className={cn(
                "flex w-full items-start gap-2 rounded-xl border p-2.5 text-left font-chinese text-sm transition-colors",
                userAnswer === oi
                  ? submitted
                    ? oi === ca.index
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15"
                      : "border-rose-400 bg-rose-50 dark:bg-rose-500/15"
                    : "border-primary bg-primary/10"
                  : submitted && oi === ca.index
                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
                    : "hover:border-primary/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                  submitted && oi === ca.index && "border-emerald-500 bg-emerald-500 text-white",
                )}
              >
                {String.fromCharCode(65 + oi)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug">{opt.text}</span>
                {submitted && opt.translation && (
                  <span className="mt-0.5 block font-sans text-xs font-normal not-italic text-muted-foreground">
                    {opt.translation}
                  </span>
                )}
              </span>
              {submitted && oi === ca.index && (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              )}
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
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15"
                      : "border-rose-400 bg-rose-50 dark:bg-rose-500/15"
                    : "border-primary bg-primary/10"
                  : submitted && val === ca.value
                    ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-500/40 dark:bg-emerald-500/10"
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
              submitted && (isCorrect ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-500/15" : "border-rose-300 bg-rose-50 dark:bg-rose-500/15"),
            )}
          />
          {submitted && !isCorrect && correctText && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
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

      {submitted &&
        q.supportingQuote &&
        (onShowEvidence ? (
          <button
            type="button"
            onClick={onShowEvidence}
            className="mt-3 block w-full rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-left text-xs text-emerald-800 transition-colors hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25"
          >
            <span className="font-semibold">📍 Đáp án nằm ở đoạn:</span>{" "}
            <span className="font-chinese">{q.supportingQuote}</span>
            {q.quoteTranslation && (
              <span className="mt-1 block italic text-emerald-700/80 dark:text-emerald-300/80">“{q.quoteTranslation}”</span>
            )}
            <span className="mt-1 block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Bấm để xem &amp; tô sáng trong đoạn văn →
            </span>
          </button>
        ) : (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-200">
            <span className="font-semibold">📍 Đáp án nằm ở đoạn:</span>{" "}
            <span className="font-chinese">{q.supportingQuote}</span>
            {q.quoteTranslation && (
              <span className="mt-1 block italic text-emerald-700/80 dark:text-emerald-300/80">“{q.quoteTranslation}”</span>
            )}
          </div>
        ))}
      {submitted && q.explanation && (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200">
          <span className="font-semibold">💡 Giải thích:</span> {q.explanation}
        </div>
      )}
    </div>
  );
}
