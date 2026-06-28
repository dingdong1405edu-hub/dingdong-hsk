"use client";
import { useState } from "react";
import { toast } from "sonner";
import { FileJson } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaField } from "./media-field";
import { buildWritingContent } from "@/lib/roadmap-authoring";
import type { WritingSectionContent } from "@/lib/roadmap-content";

const selectCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm";
const TASK_TYPES = [
  { value: "FREE", label: "Viết tự do" },
  { value: "GUIDED", label: "Có gợi ý" },
  { value: "PICTURE_DESCRIPTION", label: "Tả tranh" },
] as const;

const FULL_JSON_PLACEHOLDER = `{
  "taskType": "GUIDED",
  "prompt": "Viết một đoạn văn giới thiệu gia đình của bạn.",
  "promptZh": "请写一段话介绍你的家庭。",
  "outline": "Mở bài: gia đình có mấy người\\nThân bài: nghề nghiệp từng người\\nKết bài: cảm nghĩ",
  "minChars": 80,
  "timeLimit": 900
}`;

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

  const [json, setJson] = useState("");
  function applyJson() {
    if (!json.trim()) {
      toast.error("Ô JSON đang trống.");
      return;
    }
    try {
      // buildWritingContent chuẩn hoá + điền mặc định; nhận cả object lẫn mảng 1 bài.
      onChange(buildWritingContent(JSON.parse(json)));
      toast.success("Đã áp dụng JSON cho phần Viết.");
      setJson("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON không hợp lệ.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Dán JSON cả phần Viết: điền nhanh đề bài + cấu hình trong một lần */}
      <details className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          <FileJson className="mr-1 inline h-4 w-4" /> Dán JSON cả phần (đề bài + dàn ý + cấu hình)
        </summary>
        <div className="mt-2 space-y-2">
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={FULL_JSON_PLACEHOLDER}
            className="min-h-40 font-mono text-xs"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground">
            Một object: <code>taskType</code> (FREE | GUIDED | PICTURE_DESCRIPTION) ·{" "}
            <code>prompt</code> (đề bài VI, bắt buộc) · tuỳ chọn <code>promptZh</code> ·{" "}
            <code>outline</code> (dàn ý, mỗi ý một dòng) · <code>imageUrl</code> ·{" "}
            <code>minChars</code> · <code>timeLimit</code> (giây). Dán sẽ <b>thay toàn bộ</b> nội dung phần Viết bên dưới.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={applyJson} className="gap-1.5">
            <FileJson className="h-4 w-4" /> Áp dụng JSON
          </Button>
        </div>
      </details>

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
