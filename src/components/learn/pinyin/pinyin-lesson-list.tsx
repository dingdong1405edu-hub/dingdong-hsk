import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PinyinLessonSummary } from "@/lib/pinyin-lessons";

export interface PinyinProgressInfo {
  completed: boolean;
  bestScore: number;
}

const KIND_LABEL: Record<PinyinLessonSummary["kind"], string> = {
  tones: "Thanh điệu",
  initials: "Thanh mẫu",
  finals: "Vận mẫu",
  review: "Ôn tập",
};

export function PinyinLessonList({
  lessons,
  progress,
}: {
  lessons: PinyinLessonSummary[];
  progress: Record<string, PinyinProgressInfo>;
}) {
  return (
    <div className="space-y-2.5">
      {lessons.map((lesson, i) => {
        const done = progress[lesson.id]?.completed ?? false;
        const best = progress[lesson.id]?.bestScore ?? 0;
        return (
          <Link
            key={lesson.id}
            href={`/hanzi/pinyin/${lesson.id}`}
            className="group flex items-center gap-3.5 rounded-2xl border bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-soft"
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold",
                done
                  ? "bg-green-500 text-white"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
              )}
            >
              {done ? <Check className="h-5 w-5" /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{lesson.title}</span>
                <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:inline">
                  {KIND_LABEL[lesson.kind]}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">{lesson.subtitle}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {lesson.quizzes} câu luyện
                {done && <span className="ml-2 font-semibold text-green-600 dark:text-green-400">Tốt nhất {best}%</span>}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        );
      })}
    </div>
  );
}
