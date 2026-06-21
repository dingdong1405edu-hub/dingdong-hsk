"use client";

import { BookMarked } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseTheme } from "@/lib/roadmap";

interface ChapterBannerProps {
  index: number;
  title: string;
  theme: CourseTheme;
  done: number;
  total: number;
}

/** Banner đầu mỗi chương trên bản đồ học (kiểu "unit" của Duolingo). */
export function ChapterBanner({ index, title, theme, done, total }: ChapterBannerProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-r p-4 text-white shadow-soft",
        theme.hero,
      )}
    >
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
            Chương {index}
          </div>
          <div className="truncate text-lg font-extrabold leading-tight">{title}</div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <BookMarked className="h-5 w-5 text-white/90" />
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
            {done}/{total}
          </span>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-3 -top-5 select-none font-chinese text-7xl leading-none text-white/10">
        {theme.char}
      </div>
    </div>
  );
}
