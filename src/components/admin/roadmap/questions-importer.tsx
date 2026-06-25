"use client";
import { useState } from "react";
import { Sparkles, Loader2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HSKLevel } from "@prisma/client";
import type { RoadmapQuestion } from "@/lib/roadmap-content";
import {
  generateRoadmapReadingQuestionsAction,
  generateRoadmapListeningQuestionsAction,
} from "@/server/actions/roadmap-admin";

const PLACEHOLDER = `[
  { "type": "MCQ", "prompt": "作者周末做了什么?", "options": ["去公园", "在家睡觉", "去上班", "看医生"], "answer": 0, "explanation": "...", "supportingQuote": "周末我去了公园" },
  { "type": "TRUE_FALSE", "prompt": "作者喜欢运动。", "answer": true, "explanation": "..." },
  { "type": "FILL_BLANK", "prompt": "作者每天早上去 ___ 跑步。", "answer": "公园", "accepted": ["公园里"] }
]`;

/** Chuyển JSON tác giả (MCQ/TRUE_FALSE/FILL_BLANK với `answer`) → RoadmapQuestion[]. */
function authoringToRoadmapQuestions(jsonText: string): RoadmapQuestion[] {
  const arr: unknown = JSON.parse(jsonText);
  if (!Array.isArray(arr)) throw new Error("JSON phải là một mảng câu hỏi [].");
  const out: RoadmapQuestion[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const type = String(r.type ?? "").toUpperCase();
    const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
    if (!prompt) continue;
    const base = {
      prompt,
      promptTranslation: typeof r.promptTranslation === "string" ? r.promptTranslation : undefined,
      explanation: typeof r.explanation === "string" ? r.explanation : undefined,
      supportingQuote: typeof r.supportingQuote === "string" ? r.supportingQuote : undefined,
      quoteTranslation: typeof r.quoteTranslation === "string" ? r.quoteTranslation : undefined,
    };
    if (type === "MCQ") {
      const opts = Array.isArray(r.options) ? r.options.map((o) => String(o)) : [];
      if (opts.length < 2) continue;
      const tr = Array.isArray(r.optionsTranslation) ? r.optionsTranslation.map((o) => String(o)) : [];
      const answer = typeof r.answer === "number" ? r.answer : 0;
      out.push({
        ...base,
        type: "MCQ",
        options: opts.map((t, i) => ({ text: t, ...(tr[i] ? { translation: tr[i] } : {}) })),
        correctAnswer: { index: Math.max(0, Math.min(opts.length - 1, answer)) },
      });
    } else if (type === "TRUE_FALSE") {
      out.push({ ...base, type: "TRUE_FALSE", correctAnswer: { value: r.answer === true || r.answer === "true" } });
    } else if (type === "FILL_BLANK" || type === "SHORT_ANSWER") {
      out.push({
        ...base,
        type: "FILL_BLANK",
        correctAnswer: {
          text: typeof r.answer === "string" ? r.answer : "",
          accepted: Array.isArray(r.accepted) ? r.accepted.map((a) => String(a)) : [],
        },
      });
    }
  }
  if (out.length === 0) throw new Error("Không có câu hỏi hợp lệ trong JSON.");
  return out;
}

export function RoadmapQuestionsImporter({
  skill,
  source,
  hskLevel,
  onImport,
}: {
  skill: "READING" | "LISTENING";
  /** Đoạn văn (đọc) hoặc lời thoại (nghe) để AI sinh câu hỏi. */
  source: string;
  hskLevel: HSKLevel;
  onImport: (questions: RoadmapQuestion[]) => void;
}) {
  const [json, setJson] = useState("");
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    const res =
      skill === "READING"
        ? await generateRoadmapReadingQuestionsAction({ passage: source, hskLevel, count })
        : await generateRoadmapListeningQuestionsAction({ transcript: source, hskLevel, count });
    setGenerating(false);
    if (res.ok && res.data) {
      setJson(res.data.json);
      toast.success("AI đã tạo câu hỏi — kiểm tra/sửa rồi bấm Thêm.");
    } else {
      toast.error(res.ok ? "Lỗi tạo câu hỏi." : res.error);
    }
  }

  function handleAdd() {
    if (!json.trim()) {
      toast.error("Ô JSON đang trống.");
      return;
    }
    try {
      const qs = authoringToRoadmapQuestions(json);
      onImport(qs);
      toast.success(`Đã thêm ${qs.length} câu hỏi.`);
      setJson("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON không hợp lệ.");
    }
  }

  return (
    <details className="rounded-xl border bg-muted/20 p-3">
      <summary className="cursor-pointer text-sm font-medium">
        AI tạo câu hỏi / nhập JSON hàng loạt
      </summary>
      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Số câu AI tạo</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="h-8 w-20"
              disabled={generating}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleGenerate} disabled={generating} className="gap-1.5">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
            AI tạo câu hỏi {skill === "READING" ? "từ đoạn văn" : "từ lời thoại"}
          </Button>
        </div>
        <Textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={PLACEHOLDER}
          className="min-h-40 font-mono text-xs"
          spellCheck={false}
          disabled={generating}
        />
        <p className="text-[11px] text-muted-foreground">
          Dán mảng JSON câu hỏi (hoặc bấm AI). MCQ kèm <code>options</code> + <code>answer</code> (chỉ số từ 0);
          TRUE_FALSE <code>answer</code> true/false; FILL_BLANK <code>answer</code> là chữ Hán.
        </p>
        <Button type="button" size="sm" onClick={handleAdd} disabled={generating} className="gap-1.5">
          <ListPlus className="h-4 w-4" /> Thêm tất cả vào danh sách
        </Button>
      </div>
    </details>
  );
}
