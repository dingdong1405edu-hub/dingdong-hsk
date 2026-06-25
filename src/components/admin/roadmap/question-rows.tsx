"use client";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoadmapQuestion } from "@/lib/roadmap-content";

const TYPES = [
  { value: "MCQ", label: "Trắc nghiệm" },
  { value: "TRUE_FALSE", label: "Đúng / Sai" },
  { value: "FILL_BLANK", label: "Điền từ" },
] as const;

const selectCls = "h-8 rounded-md border border-input bg-transparent px-2 text-sm";

/** Trình soạn danh sách câu hỏi (MCQ / Đúng-Sai / Điền từ) — dùng cho Đọc & Nghe. */
export function QuestionRows({
  value,
  onChange,
  quoteLabel = "Trích dẫn chứng (tuỳ chọn)",
}: {
  value: RoadmapQuestion[];
  onChange: (v: RoadmapQuestion[]) => void;
  quoteLabel?: string;
}) {
  const rows = value ?? [];

  function update(i: number, patch: Partial<RoadmapQuestion>) {
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([
      ...rows,
      { type: "MCQ", prompt: "", options: [{ text: "" }, { text: "" }], correctAnswer: { index: 0 } },
    ]);
  }
  function remove(i: number) {
    onChange(rows.filter((_, j) => j !== i));
  }
  function changeType(i: number, type: RoadmapQuestion["type"]) {
    if (type === "MCQ") {
      const opts = rows[i].options?.length ? rows[i].options : [{ text: "" }, { text: "" }];
      update(i, { type, options: opts, correctAnswer: { index: 0 } });
    } else if (type === "TRUE_FALSE") {
      update(i, { type, options: undefined, correctAnswer: { value: true } });
    } else {
      update(i, { type, options: undefined, correctAnswer: { text: "", accepted: [] } });
    }
  }

  function setOptionText(i: number, oi: number, text: string) {
    const opts = [...(rows[i].options ?? [])];
    opts[oi] = { ...opts[oi], text };
    update(i, { options: opts });
  }
  function addOption(i: number) {
    update(i, { options: [...(rows[i].options ?? []), { text: "" }] });
  }
  function removeOption(i: number, oi: number) {
    const opts = (rows[i].options ?? []).filter((_, k) => k !== oi);
    let ca = rows[i].correctAnswer;
    if (typeof ca.index === "number" && ca.index >= opts.length) {
      ca = { index: Math.max(0, opts.length - 1) };
    }
    update(i, { options: opts, correctAnswer: ca });
  }

  return (
    <div className="space-y-3">
      {rows.map((q, i) => (
        <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Câu {i + 1}</span>
              <select
                value={q.type}
                onChange={(e) => changeType(i, e.target.value as RoadmapQuestion["type"])}
                className={selectCls}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={() => remove(i)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>

          <Textarea
            value={q.prompt}
            onChange={(e) => update(i, { prompt: e.target.value })}
            placeholder="Nội dung câu hỏi (Hán tự)..."
            className="min-h-12 font-chinese text-sm"
          />
          <Input
            value={q.promptTranslation ?? ""}
            onChange={(e) => update(i, { promptTranslation: e.target.value || null })}
            placeholder="Dịch câu hỏi (tiếng Việt, tuỳ chọn)"
            className="h-8 text-sm"
          />

          {q.type === "MCQ" && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Đáp án (bấm vòng tròn để chọn đáp án đúng)
              </p>
              {(q.options ?? []).map((opt, oi) => {
                const correct = q.correctAnswer.index === oi;
                return (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => update(i, { correctAnswer: { index: oi } })}
                      aria-label="Chọn đáp án đúng"
                      className={cn(
                        "shrink-0 rounded-full p-0.5",
                        correct ? "text-green-600" : "text-muted-foreground/40 hover:text-muted-foreground"
                      )}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <Input
                      value={opt.text}
                      onChange={(e) => setOptionText(i, oi, e.target.value)}
                      placeholder={`Lựa chọn ${oi + 1}`}
                      className="h-8 font-chinese text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOption(i, oi)}
                      disabled={(q.options ?? []).length <= 2}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
              <Button type="button" size="sm" variant="outline" onClick={() => addOption(i)}>
                <Plus className="h-3.5 w-3.5" /> Thêm lựa chọn
              </Button>
            </div>
          )}

          {q.type === "TRUE_FALSE" && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Đáp án đúng</p>
              <select
                value={q.correctAnswer.value ? "true" : "false"}
                onChange={(e) => update(i, { correctAnswer: { value: e.target.value === "true" } })}
                className={selectCls}
              >
                <option value="true">Đúng (正确)</option>
                <option value="false">Sai (错误)</option>
              </select>
            </div>
          )}

          {q.type === "FILL_BLANK" && (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <Input
                value={q.correctAnswer.text ?? ""}
                onChange={(e) => update(i, { correctAnswer: { ...q.correctAnswer, text: e.target.value } })}
                placeholder="Đáp án đúng (Hán tự)"
                className="h-8 font-chinese text-sm"
              />
              <Input
                value={(q.correctAnswer.accepted ?? []).join(", ")}
                onChange={(e) =>
                  update(i, {
                    correctAnswer: {
                      ...q.correctAnswer,
                      accepted: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                placeholder="Đáp án thay thế, cách nhau bởi dấu phẩy"
                className="h-8 font-chinese text-sm"
              />
            </div>
          )}

          <Textarea
            value={q.explanation ?? ""}
            onChange={(e) => update(i, { explanation: e.target.value || null })}
            placeholder="Giải thích đáp án (tuỳ chọn)"
            className="min-h-10 text-sm"
          />
          <Input
            value={q.supportingQuote ?? ""}
            onChange={(e) => update(i, { supportingQuote: e.target.value || null })}
            placeholder={quoteLabel}
            className="h-8 font-chinese text-sm"
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="h-3.5 w-3.5" /> Thêm câu hỏi
      </Button>
    </div>
  );
}
