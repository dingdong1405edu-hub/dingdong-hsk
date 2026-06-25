"use client";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toPinyin, getTone } from "@/lib/pinyin";
import { ExampleRows } from "./example-rows";
import type { HanziSectionContent, WordExample } from "@/lib/roadmap-content";

type Char = HanziSectionContent["characters"][number];
const selectCls = "h-8 rounded-md border border-input bg-transparent px-2 text-sm";

export function HanziSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<HanziSectionContent>;
  const chars: Char[] = Array.isArray(v.characters) ? (v.characters as Char[]) : [];

  function setChars(next: Char[]) {
    onChange({ ...v, characters: next });
  }
  function update(i: number, patch: Partial<Char>) {
    setChars(chars.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  function add() {
    setChars([
      ...chars,
      { character: "", pinyin: "", tone: 0, meaning: "", strokeCount: 0, examples: [] },
    ]);
  }
  function remove(i: number) {
    setChars(chars.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Mỗi chữ Hán có animation thứ tự nét (tải tự động theo chữ). Người học xem nét → tô lại → viết lại từ trí nhớ.
      </p>
      {chars.map((c, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Chữ {i + 1}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
            <Input
              value={c.character}
              onChange={(e) => update(i, { character: e.target.value })}
              onBlur={() => {
                if (c.character && !c.pinyin) {
                  const py = toPinyin(c.character);
                  update(i, { pinyin: py, tone: getTone(py) });
                }
              }}
              placeholder="你"
              className="h-8 font-chinese text-sm"
            />
            <Input
              value={c.pinyin}
              onChange={(e) => update(i, { pinyin: e.target.value })}
              placeholder="nǐ"
              className="h-8 text-sm"
            />
            <select
              value={c.tone}
              onChange={(e) => update(i, { tone: Number(e.target.value) })}
              className={selectCls}
              aria-label="Thanh điệu"
            >
              <option value={0}>Thanh nhẹ</option>
              <option value={1}>Thanh 1</option>
              <option value={2}>Thanh 2</option>
              <option value={3}>Thanh 3</option>
              <option value={4}>Thanh 4</option>
            </select>
            <Input
              value={c.strokeCount || ""}
              onChange={(e) => update(i, { strokeCount: Number(e.target.value) || 0 })}
              type="number"
              min={0}
              placeholder="Số nét"
              className="h-8 text-sm"
            />
            <Input
              value={c.meaning}
              onChange={(e) => update(i, { meaning: e.target.value })}
              placeholder="Bạn"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ví dụ</Label>
            <ExampleRows
              value={(c.examples ?? []) as WordExample[]}
              onChange={(ex) => update(i, { examples: ex })}
            />
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Thêm chữ
      </Button>
    </div>
  );
}
