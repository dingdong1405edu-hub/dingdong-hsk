"use client";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ngưỡng "qua môn" cho mọi phần trong lộ trình (chỉ thông báo Đạt/Chưa đạt, KHÔNG khoá). */
export const ROADMAP_PASS_THRESHOLD = 60;

interface Props {
  score: number;
  threshold?: number;
  /** Hiện kèm số % trước nhãn. */
  showScore?: boolean;
  className?: string;
}

/** Nhãn "Đạt — qua môn / Chưa đạt" theo ngưỡng (mặc định 60%) cho phần lộ trình. */
export function PassStatus({ score, threshold = ROADMAP_PASS_THRESHOLD, showScore = false, className }: Props) {
  const pct = Math.round(score);
  const passed = pct >= threshold;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
        passed
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        className,
      )}
    >
      {passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {showScore && <span className="tabular-nums">{pct}% ·</span>}
      {passed ? "Đạt — qua môn" : `Chưa đạt (cần ≥${threshold}%)`}
    </span>
  );
}
