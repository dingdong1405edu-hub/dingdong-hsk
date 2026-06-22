"use client";
import { Trophy, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { sectionLabel } from "@/lib/mock-exam";
import type { ExamGradeResult } from "@/server/actions/exam-submit";

export function ExamResults({
  result,
  elapsedLabel,
}: {
  result: ExamGradeResult;
  elapsedLabel: string;
}) {
  const { overall, passed, sections } = result;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Banner */}
      <div
        className={cn(
          "flex items-center justify-between gap-4 p-5",
          passed ? "bg-gradient-to-br from-emerald-50 to-white" : "bg-gradient-to-br from-amber-50 to-white",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              passed ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600",
            )}
          >
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
                  passed ? "bg-emerald-600 text-white" : "bg-amber-500 text-white",
                )}
              >
                {passed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                {passed ? "Đạt" : "Chưa đạt"}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {elapsedLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Điểm tổng (trung bình các phần)</p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-4xl font-extrabold", passed ? "text-emerald-600" : "text-amber-600")}>
            {overall}
          </div>
          <div className="text-xs text-muted-foreground">/ 100 · đạt ≥ 60</div>
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
        {sections.map((s, i) => (
          <div key={i} className="bg-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sectionLabel(s.skill, s.title)}
            </div>
            <div className="mt-1 text-2xl font-bold">
              {s.score === null ? "—" : s.score}
              {s.score !== null && <span className="text-sm font-normal text-muted-foreground"> / 100</span>}
            </div>
            {s.total > 0 && (
              <div className="text-xs text-muted-foreground">
                {s.correct}/{s.total} câu đúng
              </div>
            )}
            {s.score === null && <div className="text-xs text-amber-600">Chưa chấm được</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
