"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChapterPath } from "./chapter-path";
import { LessonDetailDialog } from "./lesson-detail-dialog";
import {
  themeFor,
  type LessonStatus,
  type RoadmapLessonDTO,
} from "@/lib/roadmap";

interface RoadmapMapProps {
  level: string;
  courseTitle: string;
  courseTitleZh: string;
  lessons: RoadmapLessonDTO[];
}

interface Chapter {
  order: number;
  title: string;
  lessons: RoadmapLessonDTO[];
  startIndex: number; // chỉ số toàn cục của bài đầu chương
  phaseOffset: number; // lệch pha sóng (gồm cả node phần thưởng các chương trước)
}

/** Trang bản đồ học của một khóa HSK (Duolingo-style). */
export function RoadmapMap({ level, courseTitle, courseTitleZh, lessons }: RoadmapMapProps) {
  const theme = themeFor(level);
  const [selected, setSelected] = useState<RoadmapLessonDTO | null>(null);

  const total = lessons.length;
  const doneCount = lessons.filter((l) => l.completed).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const currentIndex = lessons.findIndex((l) => !l.completed);

  const statusFor = (index: number): LessonStatus =>
    lessons[index].completed ? "done" : index === currentIndex ? "current" : "locked";

  // Gom bài thành chương, giữ nguyên thứ tự; tính lệch pha cho sóng sin liền mạch.
  const chapters = useMemo<Chapter[]>(() => {
    const out: Chapter[] = [];
    for (let i = 0; i < lessons.length; i++) {
      const l = lessons[i];
      const last = out[out.length - 1];
      if (!last || last.order !== l.chapterOrder) {
        out.push({
          order: l.chapterOrder,
          title: l.chapter ?? `Chương ${l.chapterOrder}`,
          lessons: [l],
          startIndex: i,
          phaseOffset: 0,
        });
      } else {
        last.lessons.push(l);
      }
    }
    // Sau khi biết kích thước từng chương: mỗi chương chiếm (số bài + 1 node thưởng) bước pha.
    let phase = 0;
    for (const c of out) {
      c.phaseOffset = phase;
      phase += c.lessons.length + 1;
    }
    return out;
  }, [lessons]);

  function handleSelect(lesson: RoadmapLessonDTO) {
    const idx = lessons.findIndex((l) => l.id === lesson.id);
    if (statusFor(idx) === "locked") {
      toast.info("Hãy hoàn thành bài trước để mở khoá bài này 🔒");
      return;
    }
    setSelected(lesson);
  }

  function handleTrophy(unlocked: boolean) {
    toast[unlocked ? "success" : "info"](
      unlocked
        ? "🎉 Tuyệt vời! Bạn đã hoàn thành cả chương."
        : "Hoàn thành tất cả bài trong chương để mở phần thưởng 🏆",
    );
  }

  return (
    <div className="space-y-6">
      {/* Header khóa học */}
      <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-soft-lg sm:p-6", theme.hero)}>
        <div className="relative z-10">
          <Link
            href="/roadmap"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Tất cả lộ trình
          </Link>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-extrabold backdrop-blur">
                {theme.label}
              </div>
              <h1 className="mt-1.5 text-2xl font-extrabold leading-tight sm:text-3xl">{courseTitle}</h1>
              <p className="font-chinese text-sm text-white/85">{courseTitleZh}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl font-extrabold tabular-nums">{pct}%</div>
              <div className="text-[11px] text-white/80">
                {doneCount}/{total} bài
              </div>
            </div>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/15">
            <div className="h-full rounded-full bg-white/90 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-10 select-none font-chinese text-[150px] leading-none text-white/10">
          {theme.char}
        </div>
      </div>

      {/* Bản đồ các chương */}
      <div className="space-y-2 pb-6">
        {chapters.map((ch, ci) => {
          const statuses = ch.lessons.map((_, i) => statusFor(ch.startIndex + i));
          return (
            <div key={ch.startIndex} className="space-y-2">
              {ci > 0 && (
                <div className="flex justify-center gap-1.5 py-1" aria-hidden>
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
                  ))}
                </div>
              )}
              <ChapterPath
                index={ch.order}
                title={ch.title}
                lessons={ch.lessons}
                statuses={statuses}
                phaseOffset={ch.phaseOffset}
                theme={theme}
                onSelect={handleSelect}
                onTrophy={handleTrophy}
              />
            </div>
          );
        })}

        {/* Cờ đích cuối lộ trình */}
        <div className="flex flex-col items-center gap-2 pt-4 text-center">
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft", theme.accentBg)}>
            <Trophy className="h-7 w-7 fill-white/30" />
          </div>
          <p className="text-sm font-semibold">
            {pct === 100 ? "Hoàn thành lộ trình! 🎊" : `Còn ${total - doneCount} bài nữa là về đích`}
          </p>
        </div>
      </div>

      <LessonDetailDialog
        lesson={selected}
        levelLabel={theme.label}
        theme={theme}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
