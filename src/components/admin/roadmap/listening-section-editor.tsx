"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, FileAudio, Wand2, Plus, Trash2, FileJson, Headphones } from "lucide-react";
import type { HSKLevel } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaField } from "./media-field";
import { QuestionRows } from "./question-rows";
import { RoadmapQuestionsImporter } from "./questions-importer";
import { transcribeListeningAudioAction } from "@/server/actions/admin";
import { generateRoadmapTranscriptExplanationAction } from "@/server/actions/roadmap-admin";
import { normalizeListeningContent, type RoadmapQuestion } from "@/lib/roadmap-content";
import { buildListeningContent } from "@/lib/roadmap-authoring";

const FULL_JSON_PLACEHOLDER = `{
  "title": "Ở chợ",
  "timeLimit": 180,
  "clips": [
    {
      "audioUrl": "",
      "transcript": "A: 你好！你想买什么？\\nB: 我想买一斤苹果。",
      "transcriptExplanation": "Tóm tắt + bản dịch + từ vựng…",
      "questions": [
        { "type": "MCQ", "prompt": "B 想买什么?", "options": ["苹果","香蕉","橙子","西瓜"], "answer": 0, "explanation": "..." },
        { "type": "TRUE_FALSE", "prompt": "B 买了一斤水果。", "answer": true }
      ]
    },
    {
      "audioUrl": "",
      "transcript": "第二段对话……",
      "questions": [ { "type": "MCQ", "prompt": "...", "options": ["A","B","C","D"], "answer": 1 } ]
    }
  ]
}`;

type ListeningState = ReturnType<typeof normalizeListeningContent>;
type ClipState = ListeningState["clips"][number];

export function ListeningSectionEditor({
  value,
  onChange,
  hskLevel,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  hskLevel: HSKLevel;
}) {
  const v = normalizeListeningContent(value);
  if (v.clips.length === 0) v.clips = [{ audioUrl: "", transcript: "", questions: [] }];

  function set(patch: Partial<ListeningState>) {
    onChange({ ...v, ...patch });
  }
  function setClip(i: number, patch: Partial<ClipState>) {
    set({ clips: v.clips.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }
  function addClip() {
    set({ clips: [...v.clips, { audioUrl: "", transcript: "", questions: [] }] });
  }
  function removeClip(i: number) {
    if (v.clips.length <= 1) return;
    set({ clips: v.clips.filter((_, j) => j !== i) });
  }

  const [busy, setBusy] = useState<{ kind: "transcribe" | "translate"; i: number } | null>(null);

  async function handleTranscribe(i: number) {
    const clip = v.clips[i];
    if (!clip.audioUrl) {
      toast.error("Chưa có audio để tạo transcript.");
      return;
    }
    setBusy({ kind: "transcribe", i });
    const res = await transcribeListeningAudioAction(clip.audioUrl);
    setBusy(null);
    if (res.ok) {
      setClip(i, { transcript: res.transcript });
      toast.success("Đã tạo transcript từ audio.");
    } else {
      toast.error(res.error);
    }
  }

  async function handleTranslate(i: number) {
    const clip = v.clips[i];
    if (!clip.transcript?.trim()) {
      toast.error("Chưa có lời thoại để dịch.");
      return;
    }
    setBusy({ kind: "translate", i });
    const res = await generateRoadmapTranscriptExplanationAction({ transcript: clip.transcript, hskLevel });
    setBusy(null);
    if (res.ok && res.data) {
      setClip(i, { transcriptExplanation: res.data.text });
      toast.success("Đã dịch & giải thích lời thoại.");
    } else {
      toast.error(res.ok ? "Lỗi dịch lời thoại." : res.error);
    }
  }

  const [json, setJson] = useState("");
  function applyJson() {
    if (!json.trim()) {
      toast.error("Ô JSON đang trống.");
      return;
    }
    try {
      const content = buildListeningContent(JSON.parse(json), v.title);
      onChange(content);
      const n = (content as ListeningState).clips?.length ?? 0;
      toast.success(`Đã nạp ${n} đoạn nghe từ JSON.`);
      setJson("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "JSON không hợp lệ.");
    }
  }

  return (
    <div className="space-y-3">
      {/* Dán JSON cả phần Nghe */}
      <details className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-primary">
          <FileJson className="mr-1 inline h-4 w-4" /> Dán JSON cả phần (nhiều đoạn nghe + câu hỏi + giải thích)
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
            Một object có <code>clips</code> (mảng nhiều đoạn nghe), mỗi đoạn kèm <code>audioUrl</code>, <code>transcript</code> và
            <code> questions</code>. Để trống <code>audioUrl</code> thì trình duyệt tự đọc lời thoại bằng giọng zh-CN. Dán sẽ <b>thay
            toàn bộ</b> nội dung phần Nghe.
          </p>
          <Button type="button" size="sm" variant="outline" onClick={applyJson} className="gap-1.5">
            <FileJson className="h-4 w-4" /> Áp dụng JSON
          </Button>
        </div>
      </details>

      {/* Thông tin chung */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề phần Nghe</Label>
          <Input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Mua hoa quả ở chợ" className="h-9" />
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

      {/* Danh sách đoạn nghe */}
      {v.clips.map((c, i) => {
        const transcribing = busy?.kind === "transcribe" && busy.i === i;
        const translating = busy?.kind === "translate" && busy.i === i;
        return (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <Headphones className="h-4 w-4 text-primary" /> Đoạn {i + 1}
                {v.clips.length > 1 && <span className="text-xs font-normal text-muted-foreground">/ {v.clips.length}</span>}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeClip(i)}
                disabled={v.clips.length <= 1}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xoá đoạn
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Âm thanh (MP3)</Label>
              <MediaField kind="audio" value={c.audioUrl ?? undefined} onChange={(url) => setClip(i, { audioUrl: url ?? "" })} />
              <p className="text-[11px] text-muted-foreground">Để trống thì trình duyệt tự đọc lời thoại bằng giọng zh-CN.</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Lời thoại (transcript)</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => handleTranscribe(i)} disabled={!!busy} className="h-7 gap-1.5 text-xs">
                  {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileAudio className="h-3.5 w-3.5" />}
                  Tạo transcript từ audio
                </Button>
              </div>
              <Textarea
                value={c.transcript ?? ""}
                onChange={(e) => setClip(i, { transcript: e.target.value || null })}
                placeholder={"A: 你好！你想买什么？\nB: 我想买一斤苹果。"}
                className="min-h-20 font-chinese text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Dịch &amp; giải thích lời thoại (hiện sau khi nộp)</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => handleTranslate(i)} disabled={!!busy} className="h-7 gap-1.5 text-xs">
                  {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
                  AI dịch &amp; giải thích
                </Button>
              </div>
              <Textarea
                value={c.transcriptExplanation ?? ""}
                onChange={(e) => setClip(i, { transcriptExplanation: e.target.value || null })}
                placeholder="Tóm tắt + bản dịch + từ vựng..."
                className="min-h-16 text-sm"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ảnh minh hoạ đoạn (tuỳ chọn)</Label>
              <MediaField kind="image" value={c.imageUrl ?? undefined} onChange={(url) => setClip(i, { imageUrl: url })} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Câu hỏi của đoạn {i + 1}</Label>
              <RoadmapQuestionsImporter
                skill="LISTENING"
                source={c.transcript ?? ""}
                hskLevel={hskLevel}
                onImport={(qs) => setClip(i, { questions: [...(c.questions as RoadmapQuestion[]), ...qs] })}
              />
              <QuestionRows
                value={c.questions as RoadmapQuestion[]}
                onChange={(qs) => setClip(i, { questions: qs })}
                quoteLabel="Trích lời thoại chứng minh đáp án (tuỳ chọn)"
              />
            </div>
          </div>
        );
      })}

      <Button type="button" size="sm" variant="outline" onClick={addClip} className="gap-1.5">
        <Plus className="h-4 w-4" /> Thêm đoạn nghe
      </Button>
    </div>
  );
}
