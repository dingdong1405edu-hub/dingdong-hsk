"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, FileAudio, Wand2 } from "lucide-react";
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
import type { ListeningSectionContent, RoadmapQuestion } from "@/lib/roadmap-content";

export function ListeningSectionEditor({
  value,
  onChange,
  hskLevel,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  hskLevel: HSKLevel;
}) {
  const v = (value ?? {}) as Partial<ListeningSectionContent>;
  function set(patch: Partial<ListeningSectionContent>) {
    onChange({ ...v, ...patch });
  }
  const questions = (v.questions ?? []) as RoadmapQuestion[];

  const [transcribing, setTranscribing] = useState(false);
  const [translating, setTranslating] = useState(false);

  async function handleTranscribe() {
    if (!v.audioUrl) {
      toast.error("Chưa có audio để tạo transcript.");
      return;
    }
    setTranscribing(true);
    const res = await transcribeListeningAudioAction(v.audioUrl);
    setTranscribing(false);
    if (res.ok) {
      set({ transcript: res.transcript });
      toast.success("Đã tạo transcript từ audio.");
    } else {
      toast.error(res.error);
    }
  }

  async function handleTranslate() {
    if (!v.transcript?.trim()) {
      toast.error("Chưa có lời thoại để dịch.");
      return;
    }
    setTranslating(true);
    const res = await generateRoadmapTranscriptExplanationAction({ transcript: v.transcript, hskLevel });
    setTranslating(false);
    if (res.ok && res.data) {
      set({ transcriptExplanation: res.data.text });
      toast.success("Đã dịch & giải thích lời thoại.");
    } else {
      toast.error(res.ok ? "Lỗi dịch lời thoại." : res.error);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Tiêu đề</Label>
          <Input value={v.title ?? ""} onChange={(e) => set({ title: e.target.value })} placeholder="Mua hoa quả ở chợ" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Thời gian (giây)</Label>
          <Input
            type="number"
            min={0}
            value={v.timeLimit ?? 180}
            onChange={(e) => set({ timeLimit: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Âm thanh (MP3)</Label>
        <MediaField kind="audio" value={v.audioUrl} onChange={(url) => set({ audioUrl: url ?? "" })} />
        <p className="text-[11px] text-muted-foreground">
          Để trống thì trình duyệt tự đọc lời thoại bằng giọng zh-CN.
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Lời thoại (transcript)</Label>
          <Button type="button" size="sm" variant="outline" onClick={handleTranscribe} disabled={transcribing} className="h-7 gap-1.5 text-xs">
            {transcribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileAudio className="h-3.5 w-3.5" />}
            Tạo transcript từ audio
          </Button>
        </div>
        <Textarea
          value={v.transcript ?? ""}
          onChange={(e) => set({ transcript: e.target.value || null })}
          placeholder={"A: 你好！你想买什么？\nB: 我想买一斤苹果。"}
          className="min-h-20 font-chinese text-sm"
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Dịch &amp; giải thích lời thoại (hiện sau khi nộp)</Label>
          <Button type="button" size="sm" variant="outline" onClick={handleTranslate} disabled={translating} className="h-7 gap-1.5 text-xs">
            {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
            AI dịch &amp; giải thích
          </Button>
        </div>
        <Textarea
          value={v.transcriptExplanation ?? ""}
          onChange={(e) => set({ transcriptExplanation: e.target.value || null })}
          placeholder="Tóm tắt + bản dịch + từ vựng..."
          className="min-h-16 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ảnh đại diện (tuỳ chọn)</Label>
        <MediaField kind="image" value={v.imageUrl} onChange={(url) => set({ imageUrl: url })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">Câu hỏi</Label>
        <RoadmapQuestionsImporter
          skill="LISTENING"
          source={v.transcript ?? ""}
          hskLevel={hskLevel}
          onImport={(qs) => set({ questions: [...questions, ...qs] })}
        />
        <QuestionRows
          value={questions}
          onChange={(qs) => set({ questions: qs })}
          quoteLabel="Trích lời thoại chứng minh đáp án (tuỳ chọn)"
        />
      </div>
    </div>
  );
}
