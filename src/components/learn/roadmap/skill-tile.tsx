"use client";

import Link from "next/link";
import { Check, ChevronRight, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillMeta } from "@/lib/roadmap";

interface SkillTileProps {
  meta: SkillMeta;
  published: boolean;
  done: boolean;
  onClick: () => void;
  /** Nếu có (phần đã publish): hiện nút "Tải PDF" cạnh ô kỹ năng. */
  pdfHref?: string;
}

/** Một ô kỹ năng (từ vựng / ngữ pháp / nghe / nói / đọc / viết) trong hộp thoại bài học. */
export function SkillTile({ meta, published, done, onClick, pdfHref }: SkillTileProps) {
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft",
        done
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-400/25 dark:bg-emerald-500/10"
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.iconBg, meta.iconText)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-semibold leading-tight">
            {meta.label}
            <span className="font-chinese text-xs font-normal text-muted-foreground">{meta.labelZh}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {done ? "Đã hoàn thành" : published ? "Sẵn sàng học" : "Sắp có nội dung"}
          </div>
        </div>
        {done ? (
          <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" strokeWidth={3} />
        ) : published ? (
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        ) : (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Sắp có
          </span>
        )}
      </button>
      {pdfHref && published && (
        <Link
          href={pdfHref}
          title="Tải PDF"
          aria-label={`Tải PDF ${meta.label}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <FileDown className="h-4 w-4" /> PDF
        </Link>
      )}
    </div>
  );
}
