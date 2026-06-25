"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toPinyin, getTone } from "@/lib/pinyin";
import { ExampleRows } from "./example-rows";
import type { HanziSectionContent, WordExample } from "@/lib/roadmap-content";

type Char = HanziSectionContent["characters"][number];
const selectCls = "h-8 rounded-md border border-input bg-transparent px-2 text-sm";

/** Cột: Hán tự · Pinyin (trống = tự sinh) · Nghĩa · Số nét. Mỗi dòng một chữ. */
function parseHanziPaste(text: string): Char[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
      const character = cells[0] ?? "";
      const pinyin = cells[1] || (character ? toPinyin(character) : "");
      return {
        character,
        pinyin,
        tone: getTone(pinyin),
        meaning: cells[2] ?? "",
        strokeCount: Number(cells[3]) || 0,
        examples: [] as WordExample[],
      };
    })
    .filter((c) => c.character && c.meaning && /\p{Script=Han}/u.test(c.character));
}

export function HanziSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<HanziSectionContent>;
  const chars: Char[] = Array.isArray(v.characters) ? (v.characters as Char[]) : [];
  const [paste, setPaste] = useState("");

  function importPaste() {
    const parsed = parseHanziPaste(paste);
    if (parsed.length === 0) {
      toast.error("Không có dòng hợp lệ (cần Hán tự + nghĩa).");
      return;
    }
    setChars([...chars, ...parsed]);
    toast.success(`Đã thêm ${parsed.length} chữ.`);
    setPaste("");
  }

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

      <details className="rounded-xl border bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium">Nhập hàng loạt</summary>
        <div className="mt-2 space-y-2">
          <Textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"你\tnǐ\tBạn\t7\n我\twǒ\tTôi\t7"}
            className="min-h-24 font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Mỗi dòng: <b>Hán tự</b> · Pinyin (trống = tự sinh) · <b>Nghĩa</b> · Số nét. Ngăn cách bằng Tab hoặc dấu phẩy.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={importPaste}>
            <Plus className="h-3.5 w-3.5" /> Thêm vào danh sách
          </Button>
        </div>
      </details>
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
