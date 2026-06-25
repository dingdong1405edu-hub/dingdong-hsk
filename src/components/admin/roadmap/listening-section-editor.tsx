"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaField } from "./media-field";
import { QuestionRows } from "./question-rows";
import type { ListeningSectionContent, RoadmapQuestion } from "@/lib/roadmap-content";

export function ListeningSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<ListeningSectionContent>;
  function set(patch: Partial<ListeningSectionContent>) {
    onChange({ ...v, ...patch });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề</Label>
          <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Mua hoa quả ở chợ" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thời gian (giây)</Label>
          <Input
            type="number"
            min={0}
            value={v.timeLimit ?? 180}
            onChange={(e) => set({ timeLimit: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Âm thanh (MP3)</Label>
        <MediaField kind="audio" value={v.audioUrl} onChange={(url) => set({ audioUrl: url ?? "" })} />
        <p className="text-[11px] text-muted-foreground">
          Để trống thì trình duyệt tự đọc lời thoại bằng giọng zh-CN.
        </p>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Lời thoại (transcript)</Label>
        <Textarea
          value={v.transcript ?? ""}
          onChange={(e) => set({ transcript: e.target.value || null })}
          placeholder={"A: 你好！你想买什么？\nB: 我想买一斤苹果。"}
          className="min-h-20 font-chinese text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Dịch &amp; giải thích lời thoại (tuỳ chọn — hiện sau khi nộp)</Label>
        <Textarea
          value={v.transcriptExplanation ?? ""}
          onChange={(e) => set({ transcriptExplanation: e.target.value || null })}
          placeholder="Tóm tắt + bản dịch + từ vựng..."
          className="min-h-16 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ảnh đại diện (tuỳ chọn)</Label>
        <MediaField kind="image" value={v.imageUrl} onChange={(url) => set({ imageUrl: url })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Câu hỏi</Label>
        <QuestionRows
          value={(v.questions ?? []) as RoadmapQuestion[]}
          onChange={(qs) => set({ questions: qs })}
          quoteLabel="Trích lời thoại chứng minh đáp án (tuỳ chọn)"
        />
      </div>
    </div>
  );
}
