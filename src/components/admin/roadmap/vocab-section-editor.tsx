"use client";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toPinyin } from "@/lib/pinyin";
import { ExampleRows } from "./example-rows";
import { RoadmapVocabImport } from "./vocab-import";
import type { VocabSectionContent, WordExample } from "@/lib/roadmap-content";

type Word = VocabSectionContent["words"][number];

export function VocabSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<VocabSectionContent>;
  const words: Word[] = Array.isArray(v.words) ? (v.words as Word[]) : [];

  function setWords(next: Word[]) {
    onChange({ ...v, words: next });
  }
  function update(i: number, patch: Partial<Word>) {
    setWords(words.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function add() {
    setWords([...words, { hanzi: "", pinyin: "", meaning: "", audioUrl: null, examples: [] }]);
  }
  function remove(i: number) {
    setWords(words.filter((_, j) => j !== i));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Mỗi từ gồm chữ Hán, pinyin, nghĩa và ví dụ. Học viên học từng từ: xem thẻ → tập viết → nhớ lại → flashcard.
        </p>
        <RoadmapVocabImport onImport={(ws) => setWords([...words, ...ws])} />
      </div>
      {words.map((w, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Từ {i + 1}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <Input
              value={w.hanzi}
              onChange={(e) => update(i, { hanzi: e.target.value })}
              onBlur={() => {
                if (w.hanzi && !w.pinyin) update(i, { pinyin: toPinyin(w.hanzi) });
              }}
              placeholder="你好"
              className="h-8 font-chinese text-sm"
            />
            <Input
              value={w.pinyin}
              onChange={(e) => update(i, { pinyin: e.target.value })}
              placeholder="nǐ hǎo"
              className="h-8 text-sm"
            />
            <Input
              value={w.meaning}
              onChange={(e) => update(i, { meaning: e.target.value })}
              placeholder="Xin chào"
              className="h-8 text-sm"
            />
          </div>
          <Input
            value={w.audioUrl ?? ""}
            onChange={(e) => update(i, { audioUrl: e.target.value || null })}
            placeholder="URL audio (.mp3) — để trống thì trình duyệt tự đọc"
            className="h-8 text-sm"
          />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ví dụ</Label>
            <ExampleRows
              value={(w.examples ?? []) as WordExample[]}
              onChange={(ex) => update(i, { examples: ex })}
            />
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Thêm từ
      </Button>
    </div>
  );
}
