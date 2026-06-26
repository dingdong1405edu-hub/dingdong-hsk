"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Lock, Sparkles, Star } from "lucide-react";
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
import { SKILL_META, type CourseTheme, type RoadmapLessonDTO, type SkillKey } from "@/lib/roadmap";

interface LessonDetailDialogProps {
  lesson: RoadmapLessonDTO | null;
  levelLabel: string;
  /** Slug cấp HSK (vd "hsk1") để dựng đường dẫn chơi từng phần. */
  levelSlug: string;
  theme: CourseTheme;
  /** Bài bị khoá vì chưa mua gói lộ trình → hiện CTA nâng cấp thay vì kỹ năng. */
  locked: boolean;
  upgradeHref: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Hộp thoại chi tiết một bài: tên chương, chủ đề, nội dung/thông tin, vòng tròn
 * % hoàn thành và 6 kỹ năng (từ vựng, ngữ pháp, nghe, nói, đọc, viết).
 * Nội dung từng kỹ năng sẽ được nối sau (hiện báo toast giữ chỗ).
 */
export function LessonDetailDialog({ lesson, levelLabel, levelSlug, theme, locked, upgradeHref, onOpenChange }: LessonDetailDialogProps) {
  const router = useRouter();
  const open = lesson !== null;
  const publishedBySkill = new Map((lesson?.sections ?? []).map((s) => [s.skill, s.published]));
  const doneSkills = new Set(lesson?.skillsDone ?? []);

  // Mẫu số động: chỉ tính các kỹ năng ĐÃ publish trong bài này (không cố định 7).
  const playableSkills = SKILL_META.filter((m) => publishedBySkill.get(m.key));
  const total = playableSkills.length;
  const doneCount = playableSkills.filter((m) => doneSkills.has(m.key)).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  function handleSkill(skill: SkillKey, label: string, published: boolean) {
    if (!published) {
      toast.info(`Phần "${label}" đang được biên soạn — sắp ra mắt! ✨`);
      return;
    }
    if (!lesson) return;
    onOpenChange(false);
    router.push(`/roadmap/${levelSlug}/${lesson.id}/${skill.toLowerCase()}`);
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
              📖 {lesson?.chapter ? `Chương ${lesson.chapterOrder} · ${lesson.chapter}` : "Chưa phân chương"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
              <Star className="h-3.5 w-3.5 fill-white" /> +{lesson?.xpReward ?? 20} XP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 tabular-nums backdrop-blur">
              {doneCount}/{total} kỹ năng
            </span>
          </div>

          <div className="pointer-events-none absolute -right-3 -top-6 select-none font-chinese text-8xl leading-none text-white/10">
            {theme.char}
          </div>
        </div>

        {/* Nội dung / thông tin bài học */}
        <div className="p-5">
          {locked ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft", theme.accentBg)}>
                <Lock className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold">Bài học đã khoá</h3>
              <p className="text-sm text-muted-foreground">
                Mở khoá toàn bộ lộ trình {levelLabel} để học bài này và tất cả các bài còn lại.
              </p>
              <Link
                href={upgradeHref}
                className={cn(
                  "mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-soft transition-transform hover:-translate-y-0.5",
                  theme.accentBg
                )}
              >
                <Sparkles className="h-4 w-4" /> Mở khoá lộ trình
              </Link>
            </div>
          ) : (
            <>
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
                      onClick={() => handleSkill(meta.key, meta.label, published)}
                      pdfHref={
                        published && lesson ? `/roadmap-pdf/${lesson.id}/${meta.key.toLowerCase()}` : undefined
                      }
                    />
                  );
                })}
              </div>
              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Hoàn thành tất cả kỹ năng đang mở để đạt 100% và mở khoá bài tiếp theo.
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
