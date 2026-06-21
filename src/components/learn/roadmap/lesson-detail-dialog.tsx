"use client";

import { toast } from "sonner";
import { Check, Sparkles, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SkillTile } from "./skill-tile";
import { ProgressRing } from "./progress-ring";
import { SKILL_META, type CourseTheme, type RoadmapLessonDTO } from "@/lib/roadmap";

interface LessonDetailDialogProps {
  lesson: RoadmapLessonDTO | null;
  levelLabel: string;
  theme: CourseTheme;
  onOpenChange: (open: boolean) => void;
}

/**
 * Hộp thoại chi tiết một bài: tên chương, chủ đề, nội dung/thông tin, vòng tròn
 * % hoàn thành và 6 kỹ năng (từ vựng, ngữ pháp, nghe, nói, đọc, viết).
 * Nội dung từng kỹ năng sẽ được nối sau (hiện báo toast giữ chỗ).
 */
export function LessonDetailDialog({ lesson, levelLabel, theme, onOpenChange }: LessonDetailDialogProps) {
  const open = lesson !== null;
  const publishedBySkill = new Map((lesson?.sections ?? []).map((s) => [s.skill, s.published]));
  const doneSkills = new Set(lesson?.skillsDone ?? []);

  const doneCount = SKILL_META.filter((m) => doneSkills.has(m.key)).length;
  const pct = Math.round((doneCount / SKILL_META.length) * 100);

  function handleSkill(label: string, done: boolean, published: boolean) {
    if (done) {
      toast.success(`Bạn đã hoàn thành phần "${label}". Ôn lại sắp ra mắt! 🎉`);
    } else if (published) {
      toast.info(`Đang mở phần "${label}"…`);
    } else {
      toast.info(`Phần "${label}" đang được biên soạn — sắp ra mắt! ✨`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-2xl p-0 [&>button]:text-white [&>button]:opacity-90 [&>button:hover]:opacity-100">
        {/* Header có màu theo khóa */}
        <div className={cn("relative bg-gradient-to-br p-5 text-white", theme.hero)}>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                {levelLabel} · Bài {lesson?.order}
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur">
                  {lesson?.icon ?? "📘"}
                </div>
                <DialogHeader className="space-y-0.5 text-left">
                  <DialogTitle className="text-xl font-extrabold leading-tight text-white">
                    {lesson?.topic}
                  </DialogTitle>
                  <DialogDescription className="font-chinese text-sm text-white/85">
                    {lesson?.topicZh}
                  </DialogDescription>
                </DialogHeader>
              </div>
            </div>

            {/* Vòng tròn % hoàn thành bài */}
            <ProgressRing value={pct} size={68} stroke={7} color="#ffffff" className="mt-0.5 text-white">
              <div className="text-center leading-none">
                {pct === 100 ? (
                  <Check className="h-6 w-6" strokeWidth={3} />
                ) : (
                  <>
                    <span className="text-lg font-extrabold tabular-nums">{pct}</span>
                    <span className="text-[10px] font-bold">%</span>
                  </>
                )}
              </div>
            </ProgressRing>
          </div>

          {/* Thông tin: chương · XP · số kỹ năng đã xong */}
          <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
              📖 Chương {lesson?.chapterOrder}
              {lesson?.chapter ? ` · ${lesson.chapter}` : ""}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-white" /> +{lesson?.xpReward ?? 20} XP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 tabular-nums backdrop-blur">
              {doneCount}/{SKILL_META.length} kỹ năng
            </span>
          </div>

          <div className="pointer-events-none absolute -right-3 -top-6 select-none font-chinese text-8xl leading-none text-white/10">
            {theme.char}
          </div>
        </div>

        {/* Nội dung / thông tin bài học */}
        <div className="p-5">
          {lesson?.description && (
            <p className="mb-4 rounded-xl bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
              {lesson.description}
            </p>
          )}
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
            <Sparkles className={cn("h-4 w-4", theme.accentText)} /> Các kỹ năng trong bài
          </div>
          <div className="grid gap-2.5">
            {SKILL_META.map((meta) => {
              const published = publishedBySkill.get(meta.key) ?? false;
              const done = doneSkills.has(meta.key);
              return (
                <SkillTile
                  key={meta.key}
                  meta={meta}
                  published={published}
                  done={done}
                  onClick={() => handleSkill(meta.label, done, published)}
                />
              );
            })}
          </div>
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Hoàn thành cả 6 kỹ năng để đạt 100% và mở khoá bài tiếp theo.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
