"use client";
import { useState } from "react";
import { cn, hskLevelLabel } from "@/lib/utils";
import { TestCard } from "@/components/learn/test-card";

export interface ExamCardData {
  id: string;
  title: string;
  hskLevel: string;
  composition: string; // "Nghe · Đọc · Viết"
  meta: string; // "40 câu · 85 phút"
  bestScore: number | null;
  isDraft: boolean;
}

const LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

export function ExamHub({
  exams,
  defaultLevel,
}: {
  exams: ExamCardData[];
  defaultLevel: string;
}) {
  const countByLevel = (lvl: string) => exams.filter((e) => e.hskLevel === lvl).length;
  // Mặc định: cấp mục tiêu nếu có đề, nếu không thì cấp đầu tiên có đề.
  const initial =
    countByLevel(defaultLevel) > 0
      ? defaultLevel
      : LEVELS.find((l) => countByLevel(l) > 0) ?? defaultLevel;
  const [level, setLevel] = useState(initial);

  const list = exams.filter((e) => e.hskLevel === level);

  return (
    <div className="space-y-5">
      {/* Level picker — chọn cấp độ như đăng ký thi thật */}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Chọn cấp độ
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {LEVELS.map((l) => {
            const n = countByLevel(l);
            const active = level === l;
            return (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-2 py-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                )}
              >
                <span className={cn("text-sm font-extrabold", active ? "text-primary" : "text-foreground")}>
                  {hskLevelLabel(l)}
                </span>
                <span className="text-[11px] text-muted-foreground">{n} đề</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Exams for selected level */}
      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Chưa có đề thi thử cho {hskLevelLabel(level)}. Hãy chọn cấp độ khác hoặc quay lại sau nhé.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((e) => (
            <TestCard
              key={e.id}
              href={`/exam/${e.id}`}
              title={e.title}
              level={e.hskLevel}
              meta={e.meta}
              score={e.bestScore}
              attempts={0}
              tags={[e.composition, ...(e.isDraft ? ["• Bản nháp (chỉ admin thấy)"] : [])]}
              seed={e.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
