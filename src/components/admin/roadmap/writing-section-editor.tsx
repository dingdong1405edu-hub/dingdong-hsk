"use client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaField } from "./media-field";
import type { WritingSectionContent } from "@/lib/roadmap-content";

const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";
const TASK_TYPES = [
  { value: "FREE", label: "Viết tự do" },
  { value: "GUIDED", label: "Có gợi ý" },
  { value: "PICTURE_DESCRIPTION", label: "Tả tranh" },
] as const;

export function WritingSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<WritingSectionContent>;
  function set(patch: Partial<WritingSectionContent>) {
    onChange({ ...v, ...patch });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label className="text-xs">Loại bài</Label>
          <select
            value={v.taskType ?? "FREE"}
            onChange={(e) => set({ taskType: e.target.value as WritingSectionContent["taskType"] })}
            className={selectCls}
          >
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Số chữ tối thiểu</Label>
          <Input
            type="number"
            min={0}
            value={v.minChars ?? 50}
            onChange={(e) => set({ minChars: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thời gian (giây)</Label>
          <Input
            type="number"
            min={0}
            value={v.timeLimit ?? 900}
            onChange={(e) => set({ timeLimit: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Đề bài (tiếng Việt)</Label>
        <Textarea
          value={v.prompt ?? ""}
          onChange={(e) => set({ prompt: e.target.value })}
          placeholder="Viết một đoạn văn giới thiệu gia đình của bạn..."
          className="min-h-16 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Đề bài (tiếng Trung, tuỳ chọn)</Label>
        <Textarea
          value={v.promptZh ?? ""}
          onChange={(e) => set({ promptZh: e.target.value || null })}
          placeholder="请写一段话介绍你的家庭。"
          className="min-h-12 font-chinese text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Dàn ý gợi ý (mỗi ý một dòng, tuỳ chọn)</Label>
        <Textarea
          value={v.outline ?? ""}
          onChange={(e) => set({ outline: e.target.value || null })}
          placeholder={"Mở bài: gia đình có mấy người\nThân bài: nghề nghiệp từng người\nKết bài: cảm nghĩ"}
          className="min-h-16 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ảnh (cho bài tả tranh, tuỳ chọn)</Label>
        <MediaField kind="image" value={v.imageUrl} onChange={(url) => set({ imageUrl: url })} />
      </div>
    </div>
  );
}
