"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileJson, BookOpenText } from "lucide-react";
import type { HSKLevel } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaField } from "./media-field";
import { QuestionRows } from "./question-rows";
import { RoadmapQuestionsImporter } from "./questions-importer";
import { normalizeReadingContent, type RoadmapQuestion } from "@/lib/roadmap-content";
import { buildReadingContent } from "@/lib/roadmap-authoring";

const FULL_JSON_PLACEHOLDER = `{
  "title": "Cuối tuần của tôi",
  "titleZh": "我的周末",
  "timeLimit": 600,
  "passages": [
    {
      "passage": "周末我去了公园，那里有很多人……",
      "questions": [
        { "type": "MCQ", "prompt": "作者周末去了哪里?", "options": ["公园","学校","商店","医院"], "answer": 0, "explanation": "Đoạn văn nói tác giả đi công viên.", "supportingQuote": "周末我去了公园" },
        { "type": "TRUE_FALSE", "prompt": "公园里人很多。", "answer": true, "explanation": "..." },
        { "type": "FILL_BLANK", "prompt": "作者周末去了 ___。", "answer": "公园", "accepted": ["公园里"] }
      ]
    },
    {
      "passage": "第二段：我和朋友一起吃饭……",
      "questions": [
        { "type": "MCQ", "prompt": "作者和谁吃饭?", "options": ["朋友","老师","医生","家人"], "answer": 0, "explanation": "..." }
      ]
    }
  ]
}`;

type ReadingState = ReturnType<typeof normalizeReadingContent>;
type PassageState = ReadingState["passages"][number];

export function ReadingSectionEditor({
  value,
  onChange,
  hskLevel,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  hskLevel: HSKLevel;
}) {
  // Luôn làm việc trên dạng chuẩn nhiều-đoạn (đọc được cả nội dung cũ một-đoạn).
  const v = normalizeReadingContent(value);
  if (v.passages.length === 0) v.passages = [{ passage: "", questions: [] }];

  function set(patch: Partial<ReadingState>) {
    onChange({ ...v, ...patch });
  }
  function setPassage(i: number, patch: Partial<PassageState>) {
    set({ passages: v.passages.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  }
  function addPassage() {
    set({ passages: [...v.passages, { passage: "", questions: [] }] });
  }
  function removePassage(i: number) {
    if (v.passages.length <= 1) return;
    set({ passages: v.passages.filter((_, j) => j !== i) });
  }

  const [json, setJson] = useState("");
  function applyJson() {
    if (!json.trim()) {
      toast.error("Ô JSON đang trống.");
      return;
    }
    try {
      const content = buildReadingContent(JSON.parse(json), v.title);
      onChange(content);
      const n = (content as ReadingState).passages?.length ?? 0;
      toast.success(`Đã nạp ${n} đoạn đọc từ JSON.`);
      setJson("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON không hợp lệ.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Dán JSON cả phần Đọc: nhiều đoạn + câu hỏi + giải thích trong một lần */}
      <details className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          <FileJson className="mr-1 inline h-4 w-4" /> Dán JSON cả phần (nhiều bài đọc + câu hỏi + giải thích)
        </summary>
        <div className="mt-2 space-y-2">
          <Textarea
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={FULL_JSON_PLACEHOLDER}
            className="min-h-44 font-mono text-xs"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground">
            Một object có <code>passages</code> (mảng nhiều đoạn), mỗi đoạn kèm <code>questions</code>. Câu hỏi dùng
            <code> answer</code> (MCQ: chỉ số từ 0; TRUE_FALSE: true/false; FILL_BLANK: chữ Hán). Pinyin đoạn văn tự sinh nếu thiếu.
            Dán sẽ <b>thay toàn bộ</b> nội dung phần Đọc bên dưới.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={applyJson} className="gap-1.5">
            <FileJson className="h-4 w-4" /> Áp dụng JSON
          </Button>
        </div>
      </details>

      {/* Thông tin chung của phần */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề (VI)</Label>
          <Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Cuối tuần của tôi" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề (ZH)</Label>
          <Input value={v.titleZh} onChange={(e) => set({ titleZh: e.target.value })} placeholder="我的周末" className="h-9 font-chinese" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thời gian (giây)</Label>
          <Input
            type="number"
            min={0}
            value={v.timeLimit}
            onChange={(e) => set({ timeLimit: Number(e.target.value) || 0 })}
            className="h-9 w-28"
          />
        </div>
      </div>

      {/* Danh sách đoạn đọc */}
      {v.passages.map((p, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <BookOpenText className="h-4 w-4 text-primary" /> Đoạn {i + 1}
              {v.passages.length > 1 && <span className="text-xs font-normal text-muted-foreground">/ {v.passages.length}</span>}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => removePassage(i)}
              disabled={v.passages.length <= 1}
              className="text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá đoạn
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Đoạn văn (Hán tự)</Label>
            <Textarea
              value={p.passage}
              onChange={(e) => setPassage(i, { passage: e.target.value })}
              placeholder="周末我去了公园……"
              className="min-h-28 font-chinese text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Không cần nhập pinyin — máy tự sinh khi hiển thị.</p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Ảnh minh hoạ đoạn (tuỳ chọn)</Label>
            <MediaField kind="image" value={p.imageUrl ?? undefined} onChange={(url) => setPassage(i, { imageUrl: url })} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Câu hỏi của đoạn {i + 1}</Label>
            <RoadmapQuestionsImporter
              skill="READING"
              source={p.passage}
              hskLevel={hskLevel}
              onImport={(qs) => setPassage(i, { questions: [...(p.questions as RoadmapQuestion[]), ...qs] })}
            />
            <QuestionRows
              value={p.questions as RoadmapQuestion[]}
              onChange={(qs) => setPassage(i, { questions: qs })}
              quoteLabel="Trích đoạn văn chứng minh đáp án (tuỳ chọn)"
            />
          </div>
        </div>
      ))}

      <Button type="button" size="sm" variant="outline" onClick={addPassage} className="gap-1.5">
        <Plus className="h-4 w-4" /> Thêm đoạn đọc
      </Button>
    </div>
  );
}
