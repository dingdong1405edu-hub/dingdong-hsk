"use client";
import type { HSKLevel } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaField } from "./media-field";
import { QuestionRows } from "./question-rows";
import { RoadmapQuestionsImporter } from "./questions-importer";
import type { ReadingSectionContent, RoadmapQuestion } from "@/lib/roadmap-content";

export function ReadingSectionEditor({
  value,
  onChange,
  hskLevel,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  hskLevel: HSKLevel;
}) {
  const v = (value ?? {}) as Partial<ReadingSectionContent>;
  function set(patch: Partial<ReadingSectionContent>) {
    onChange({ ...v, ...patch });
  }
  const questions = (v.questions ?? []) as RoadmapQuestion[];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề (VI)</Label>
          <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Cuối tuần của tôi" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề (ZH)</Label>
          <Input value={v.titleZh ?? ""} onChange={(e) => set({ titleZh: e.target.value })} placeholder="我的周末" className="h-9 font-chinese" />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Đoạn văn (Hán tự)</Label>
        <Textarea
          value={v.passage ?? ""}
          onChange={(e) => set({ passage: e.target.value })}
          placeholder="周末我去了公园……"
          className="min-h-28 font-chinese text-sm"
        />
        <p className="text-[11px] text-muted-foreground">Không cần nhập pinyin — máy tự sinh khi hiển thị.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Thời gian (giây)</Label>
          <Input
            type="number"
            min={0}
            value={v.timeLimit ?? 600}
            onChange={(e) => set({ timeLimit: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Ảnh đại diện (tuỳ chọn)</Label>
          <MediaField kind="image" value={v.imageUrl} onChange={(url) => set({ imageUrl: url })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Câu hỏi</Label>
        <RoadmapQuestionsImporter
          skill="READING"
          source={v.passage ?? ""}
          hskLevel={hskLevel}
          onImport={(qs) => set({ questions: [...questions, ...qs] })}
        />
        <QuestionRows
          value={questions}
          onChange={(qs) => set({ questions: qs })}
          quoteLabel="Trích đoạn văn chứng minh đáp án (tuỳ chọn)"
        />
      </div>
    </div>
  );
}
