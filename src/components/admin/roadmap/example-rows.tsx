"use client";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toPinyin } from "@/lib/pinyin";
import type { WordExample } from "@/lib/roadmap-content";

/** Trình soạn danh sách ví dụ { hanzi, pinyin, meaning } — dùng cho Từ vựng & Chữ Hán. */
export function ExampleRows({
  value,
  onChange,
}: {
  value: WordExample[];
  onChange: (v: WordExample[]) => void;
}) {
  const rows = value ?? [];

  function update(i: number, patch: Partial<WordExample>) {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([...rows, { hanzi: "", pinyin: "", meaning: "" }]);
  }
  function remove(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-2">
      {rows.map((ex, i) => (
        <div key={i} className="grid grid-cols-1 gap-1.5 rounded-lg border bg-muted/20 p-2 sm:grid-cols-[1.2fr_1fr_1.2fr_auto]">
          <Input
            value={ex.hanzi}
            onChange={(e) => update(i, { hanzi: e.target.value })}
            onBlur={() => {
              if (ex.hanzi && !ex.pinyin) update(i, { pinyin: toPinyin(ex.hanzi) });
            }}
            placeholder="你好吗？"
            className="h-8 font-chinese text-sm"
          />
          <Input
            value={ex.pinyin}
            onChange={(e) => update(i, { pinyin: e.target.value })}
            placeholder="nǐ hǎo ma"
            className="h-8 text-sm"
          />
          <Input
            value={ex.meaning}
            onChange={(e) => update(i, { meaning: e.target.value })}
            placeholder="Bạn khỏe không?"
            className="h-8 text-sm"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)} aria-label="Xoá ví dụ">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Thêm ví dụ
      </Button>
    </div>
  );
}
