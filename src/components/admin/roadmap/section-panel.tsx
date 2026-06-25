"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { HSKLevel } from "@prisma/client";
import { ChevronDown, Save, Eye, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { cn } from "@/lib/utils";
import { SKILL_META, type SkillKey } from "@/lib/roadmap";
import { emptyContentFor } from "@/lib/roadmap-content";
import {
  saveRoadmapSectionAction,
  deleteRoadmapSectionAction,
} from "@/server/actions/roadmap-admin";
import { VocabSectionEditor } from "./vocab-section-editor";
import { GrammarSectionEditor } from "./grammar-section-editor";
import { HanziSectionEditor } from "./hanzi-section-editor";
import { ReadingSectionEditor } from "./reading-section-editor";
import { ListeningSectionEditor } from "./listening-section-editor";
import { WritingSectionEditor } from "./writing-section-editor";
import { SpeakingSectionEditor } from "./speaking-section-editor";

interface Props {
  lessonId: string;
  skill: SkillKey;
  hskLevel: HSKLevel;
  sectionId: string | null;
  published: boolean;
  initialContent: unknown;
}

export function SectionPanel({ lessonId, skill, hskLevel, sectionId, published, initialContent }: Props) {
  const meta = SKILL_META.find((m) => m.key === skill)!;
  const Icon = meta.icon;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<unknown>(initialContent ?? emptyContentFor(skill));
  const [pending, start] = useTransition();

  const hasContent = sectionId !== null;

  function save(publish?: boolean) {
    start(async () => {
      const res = await saveRoadmapSectionAction({ lessonId, skill, content, publish });
      if (res.ok) {
        toast.success(publish ? "Đã lưu & xuất bản." : "Đã lưu nội dung.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Lưu thất bại.");
      }
    });
  }

  function clear() {
    if (!confirm(`Xoá toàn bộ nội dung phần "${meta.label}"?`)) return;
    start(async () => {
      const res = await deleteRoadmapSectionAction({ lessonId, skill });
      if (res.ok) {
        toast.success("Đã xoá nội dung.");
        setContent(emptyContentFor(skill));
        router.refresh();
      } else {
        toast.error(res.error ?? "Xoá thất bại.");
      }
    });
  }

  function renderEditor() {
    const p = { value: content, onChange: setContent };
    switch (skill) {
      case "VOCAB":
        return <VocabSectionEditor {...p} />;
      case "GRAMMAR":
        return <GrammarSectionEditor {...p} />;
      case "HANZI":
        return <HanziSectionEditor {...p} />;
      case "READING":
        return <ReadingSectionEditor {...p} hskLevel={hskLevel} />;
      case "LISTENING":
        return <ListeningSectionEditor {...p} hskLevel={hskLevel} />;
      case "WRITING":
        return <WritingSectionEditor {...p} />;
      case "SPEAKING":
        return <SpeakingSectionEditor {...p} />;
      default:
        return null;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.iconBg, meta.iconText)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold">
            {meta.label}
            <span className="font-chinese text-xs font-normal text-muted-foreground">{meta.labelZh}</span>
          </span>
        </span>
        {hasContent ? (
          published ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-500/15 dark:text-green-300 dark:hover:bg-green-500/15">Đang hiện</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15">Bản nháp</Badge>
          )
        ) : (
          <Badge variant="outline" className="text-muted-foreground">Chưa có nội dung</Badge>
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t p-3">
          {renderEditor()}
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button type="button" size="sm" onClick={() => save()} disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu
            </Button>
            {!published && (
              <Button type="button" size="sm" variant="outline" onClick={() => save(true)} disabled={pending}>
                <Eye className="h-4 w-4" /> Lưu &amp; hiện
              </Button>
            )}
            {hasContent && sectionId && (
              <PublishToggle model="roadmapSection" id={sectionId} published={published} />
            )}
            {hasContent && (
              <Button type="button" size="sm" variant="ghost" onClick={clear} disabled={pending} className="ml-auto text-destructive">
                <Trash2 className="h-4 w-4" /> Xoá nội dung
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
