"use client";
import { useState } from "react";
import { Plus, Trash2, Wand2, AlertTriangle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toPinyin, getTone } from "@/lib/pinyin";
import { toneColor, markWord, cn } from "@/lib/utils";
import { saveVocabWordAction } from "@/server/actions/admin";
import type { VocabWordCard, WordExample } from "@/types";

interface Props {
  lessonId: string;
  unitId: string;
  word?: VocabWordCard;
  onSaved: () => void;
  onCancel: () => void;
}

const emptyExample = (): WordExample => ({ hanzi: "", pinyin: "", meaning: "" });

export function VocabWordForm({ lessonId, unitId, word, onSaved, onCancel }: Props) {
  const [hanzi, setHanzi] = useState(word?.hanzi ?? "");
  const [pinyin, setPinyin] = useState(word?.pinyin ?? "");
  const [meaning, setMeaning] = useState(word?.meaning ?? "");
  const [audioUrl, setAudioUrl] = useState(word?.audioUrl ?? "");
  const [examples, setExamples] = useState<WordExample[]>(
    word?.examples?.length ? word.examples : [emptyExample()]
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateExample(i: number, patch: Partial<WordExample>) {
    setExamples((prev) => prev.map((ex, j) => (j === i ? { ...ex, ...patch } : ex)));
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    const cleaned = examples.filter((ex) => ex.hanzi.trim());
    const res = await saveVocabWordAction({
      id: word?.id,
      lessonId,
      unitId,
      hanzi: hanzi.trim(),
      pinyin: pinyin.trim(),
      meaning: meaning.trim(),
      audioUrl: audioUrl.trim() || undefined,
      examples: cleaned,
    });
    setPending(false);
    if (res.ok) onSaved();
    else setError(res.error ?? "Lỗi không xác định.");
  }

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Chữ Hán</Label>
          <Input
            value={hanzi}
            onChange={(e) => setHanzi(e.target.value)}
            onBlur={() => {
              if (hanzi.trim() && !pinyin.trim()) setPinyin(toPinyin(hanzi.trim()));
            }}
            className="font-chinese text-lg"
            placeholder="你好"
          />
        </div>
        <div className="space-y-1">
          <Label>Pinyin</Label>
          <div className="flex gap-1.5">
            <Input
              value={pinyin}
              onChange={(e) => setPinyin(e.target.value)}
              className="font-pinyin"
              placeholder="nǐ hǎo"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              title="Gợi ý pinyin từ chữ Hán"
              onClick={() => hanzi.trim() && setPinyin(toPinyin(hanzi.trim()))}
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Nghĩa tiếng Việt</Label>
        <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Xin chào" />
      </div>

      <div className="space-y-1">
        <Label>Audio URL (tùy chọn)</Label>
        <Input
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          placeholder="https://... (bỏ trống → tự đọc bằng giọng máy zh-CN)"
        />
      </div>

      {/* Examples */}
      <div className="space-y-2">
        <Label>Câu ví dụ</Label>
        {examples.map((ex, i) => {
          const missing = ex.hanzi.trim() !== "" && hanzi.trim() !== "" && !ex.hanzi.includes(hanzi.trim());
          return (
            <div key={i} className="space-y-1.5 rounded-md border bg-background p-2.5">
              <div className="flex items-start gap-1.5">
                <Input
                  value={ex.hanzi}
                  onChange={(e) => updateExample(i, { hanzi: e.target.value })}
                  onBlur={() => {
                    if (ex.hanzi.trim() && !ex.pinyin.trim())
                      updateExample(i, { pinyin: toPinyin(ex.hanzi.trim()) });
                  }}
                  className={cn("font-chinese", missing && "border-destructive")}
                  placeholder="Câu ví dụ chứa từ"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setExamples((p) => p.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={ex.pinyin}
                onChange={(e) => updateExample(i, { pinyin: e.target.value })}
                className="font-pinyin text-sm"
                placeholder="pinyin"
              />
              <Input
                value={ex.meaning}
                onChange={(e) => updateExample(i, { meaning: e.target.value })}
                className="text-sm"
                placeholder="Nghĩa câu ví dụ"
              />
              {missing && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" /> Câu ví dụ không chứa chữ “{hanzi.trim()}”.
                </p>
              )}
            </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" onClick={() => setExamples((p) => [...p, emptyExample()])}>
          <Plus className="mr-1 h-4 w-4" /> Thêm ví dụ
        </Button>
      </div>

      {/* Preview */}
      {hanzi.trim() && (
        <div className="rounded-lg border bg-background p-3">
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Xem trước thẻ</div>
          <div className="flex items-center gap-3">
            <span className={cn("font-chinese text-3xl font-bold", toneColor(getTone(pinyin)))}>
              {hanzi}
            </span>
            <div>
              <div className="font-pinyin text-muted-foreground">{pinyin}</div>
              <div className="text-sm">{meaning}</div>
            </div>
          </div>
          {examples.filter((e) => e.hanzi.trim()).length > 0 && (
            <div className="mt-2 space-y-0.5 text-sm">
              {examples
                .filter((e) => e.hanzi.trim())
                .map((ex, i) => (
                  <div key={i} className="font-chinese">
                    {markWord(ex.hanzi, hanzi.trim()).map((seg, j) =>
                      seg.match ? (
                        <span key={j} className="font-bold text-primary">
                          {seg.text}
                        </span>
                      ) : (
                        <span key={j}>{seg.text}</span>
                      )
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} disabled={pending}>
          <Save className="mr-1.5 h-4 w-4" />
          {pending ? "Đang lưu..." : word ? "Cập nhật từ" : "Thêm từ"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="mr-1.5 h-4 w-4" /> Hủy
        </Button>
      </div>
    </div>
  );
}
