"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toPinyin } from "@/lib/pinyin";
import type { SpeakingSectionContent } from "@/lib/roadmap-content";

type Sentence = { text: string; pinyin: string };
type QItem = { question: string; pinyin: string };

export function SpeakingSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const v = (value ?? {}) as Partial<SpeakingSectionContent>;
  const part1: Sentence[] = Array.isArray(v.part1Sentences) ? (v.part1Sentences as Sentence[]) : [];
  const passage = (v.part2Passage ?? { text: "", pinyin: "" }) as Sentence;
  const part3: QItem[] = Array.isArray(v.part3Questions) ? (v.part3Questions as QItem[]) : [];

  function commit(next: Partial<SpeakingSectionContent>) {
    const merged = { part1Sentences: part1, part2Passage: passage, part3Questions: part3, ...next };
    // Đoạn văn trống → lưu null (schema không nhận { text: "" }); cho phép bộ chỉ có Phần 1 / Phần 3.
    const p = merged.part2Passage;
    onChange({ ...merged, part2Passage: p && p.text.trim() ? p : null });
  }

  const [json, setJson] = useState("");
  function applyJson() {
    try {
      const o = JSON.parse(json) as {
        part1Sentences?: Array<{ text?: unknown; pinyin?: unknown }>;
        part2Passage?: { text?: unknown; pinyin?: unknown } | null;
        part3Questions?: Array<{ question?: unknown; pinyin?: unknown }>;
      };
      const p1 = Array.isArray(o.part1Sentences)
        ? o.part1Sentences.map((s) => ({ text: String(s?.text ?? ""), pinyin: String(s?.pinyin ?? "") }))
        : [];
      const p2 =
        o.part2Passage && typeof o.part2Passage === "object"
          ? { text: String(o.part2Passage.text ?? ""), pinyin: String(o.part2Passage.pinyin ?? "") }
          : null;
      const p3 = Array.isArray(o.part3Questions)
        ? o.part3Questions.map((q) => ({ question: String(q?.question ?? ""), pinyin: String(q?.pinyin ?? "") }))
        : [];
      onChange({ part1Sentences: p1, part2Passage: p2 && p2.text.trim() ? p2 : null, part3Questions: p3 });
      toast.success("Đã áp dụng JSON.");
      setJson("");
    } catch {
      toast.error("JSON không hợp lệ.");
    }
  }

  return (
    <div className="space-y-4">
      <details className="rounded-xl border bg-muted/20 p-3">
        <summary className="cursor-pointer text-sm font-medium">Điền nhanh bằng JSON</summary>
        <div className="mt-2 space-y-2">
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={
              '{ "part1Sentences": [{"text":"你好","pinyin":"Nǐ hǎo"}], "part2Passage": {"text":"…","pinyin":"…"}, "part3Questions": [{"question":"你好吗？","pinyin":"Nǐ hǎo ma?"}] }'
            }
            className="min-h-24 font-mono text-xs"
          />
          <Button type="button" size="sm" variant="outline" onClick={applyJson}>
            Áp dụng JSON
          </Button>
        </div>
      </details>

      {/* Phần 1: Lặp câu */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Phần 1 · Lặp câu (复述)</Label>
        {part1.map((s, i) => (
          <div key={i} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={s.text}
              onChange={(e) => commit({ part1Sentences: part1.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
              onBlur={() => {
                if (s.text && !s.pinyin)
                  commit({ part1Sentences: part1.map((x, j) => (j === i ? { ...x, pinyin: toPinyin(x.text) } : x)) });
              }}
              placeholder="你好，很高兴认识你。"
              className="h-8 font-chinese text-sm"
            />
            <Input
              value={s.pinyin}
              onChange={(e) => commit({ part1Sentences: part1.map((x, j) => (j === i ? { ...x, pinyin: e.target.value } : x)) })}
              placeholder="Nǐ hǎo, hěn gāoxìng rènshi nǐ."
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => commit({ part1Sentences: part1.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => commit({ part1Sentences: [...part1, { text: "", pinyin: "" }] })}>
          <Plus className="h-3.5 w-3.5" /> Thêm câu
        </Button>
      </div>

      {/* Phần 2: Đọc đoạn văn */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Phần 2 · Đọc đoạn văn (朗读)</Label>
        <Textarea
          value={passage.text}
          onChange={(e) => commit({ part2Passage: { ...passage, text: e.target.value } })}
          onBlur={() => {
            if (passage.text && !passage.pinyin) commit({ part2Passage: { ...passage, pinyin: toPinyin(passage.text) } });
          }}
          placeholder="我叫王明，今年二十岁……"
          className="min-h-16 font-chinese text-sm"
        />
        <Textarea
          value={passage.pinyin}
          onChange={(e) => commit({ part2Passage: { ...passage, pinyin: e.target.value } })}
          placeholder="Wǒ jiào Wáng Míng, jīnnián èrshí suì…"
          className="min-h-12 text-sm"
        />
      </div>

      {/* Phần 3: Trả lời câu hỏi */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Phần 3 · Trả lời câu hỏi (回答问题)</Label>
        {part3.map((q, i) => (
          <div key={i} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={q.question}
              onChange={(e) => commit({ part3Questions: part3.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) })}
              onBlur={() => {
                if (q.question && !q.pinyin)
                  commit({ part3Questions: part3.map((x, j) => (j === i ? { ...x, pinyin: toPinyin(x.question) } : x)) });
              }}
              placeholder="你喜欢学习汉语吗？"
              className="h-8 font-chinese text-sm"
            />
            <Input
              value={q.pinyin}
              onChange={(e) => commit({ part3Questions: part3.map((x, j) => (j === i ? { ...x, pinyin: e.target.value } : x)) })}
              placeholder="Nǐ xǐhuān xuéxí Hànyǔ ma?"
              className="h-8 text-sm"
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => commit({ part3Questions: part3.filter((_, j) => j !== i) })}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => commit({ part3Questions: [...part3, { question: "", pinyin: "" }] })}>
          <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
        </Button>
      </div>
    </div>
  );
}
