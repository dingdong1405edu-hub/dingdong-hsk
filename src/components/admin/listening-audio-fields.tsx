"use client";
import { useId, useRef, useState } from "react";
import { Loader2, Trash2, Link2, UploadCloud, Sparkles, Music2, Replace } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, countChineseChars } from "@/lib/utils";

interface ListeningAudioFieldsProps {
  /** Hidden input name for the resulting audio URL. */
  audioName?: string;
  /** Hidden/textarea input name for the transcript. */
  transcriptName?: string;
  defaultAudioUrl?: string | null;
  defaultTranscript?: string | null;
  /** Unique suffix so two instances (create + edit) don't collide on element ids. */
  idSuffix?: string;
}

/**
 * Admin audio + transcript editor for a listening test. One client component so
 * "Tạo MP3 từ transcript" can read the live transcript value. Submits two fields
 * with the surrounding server-action <form>: `audioUrl` (hidden) + `transcript`.
 *
 *  - Upload an MP3/WAV/OGG/M4A file → POST /api/admin/audio (file).
 *  - Or paste a transcript and generate the MP3 via Voxtral → POST (transcript).
 *  - Or paste a direct URL (fallback for durable/CDN storage).
 */
export function ListeningAudioFields({
  audioName = "audioUrl",
  transcriptName = "transcript",
  defaultAudioUrl,
  defaultTranscript,
  idSuffix = "",
}: ListeningAudioFieldsProps) {
  const [audioUrl, setAudioUrl] = useState(defaultAudioUrl ?? "");
  const [transcript, setTranscript] = useState(defaultTranscript ?? "");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Suffix keeps element ids distinct when both the create + edit forms mount.
  const fieldId = `${useId()}${idSuffix}`;

  const charCount = countChineseChars(transcript);
  const busy = uploading || generating;

  async function uploadFile(file: File) {
    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a)$/i.test(file.name)) {
      toast.error("Vui lòng chọn tệp âm thanh (MP3, WAV, OGG, M4A)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Tệp âm thanh vượt quá 20MB");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/audio", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        setAudioUrl(data.url);
        toast.success("Đã tải audio lên");
      } else {
        toast.error(data.error ?? "Tải audio thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi tải audio");
    } finally {
      setUploading(false);
    }
  }

  async function generateFromTranscript() {
    if (!transcript.trim()) {
      toast.error("Hãy dán transcript trước khi tạo MP3");
      return;
    }
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("transcript", transcript);
      const res = await fetch("/api/admin/audio", { method: "POST", body: fd });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (data.ok && data.url) {
        setAudioUrl(data.url);
        toast.success("Đã tạo MP3 từ transcript");
      } else {
        toast.error(data.error ?? "Tạo MP3 thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi tạo MP3");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Hidden submitted value */}
      <input type="hidden" name={audioName} value={audioUrl} />

      {/* Transcript */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${fieldId}-transcript`}>Transcript (lời thoại tiếng Trung)</Label>
          <span className="text-xs text-muted-foreground">{charCount} chữ Hán</span>
        </div>
        <Textarea
          id={`${fieldId}-transcript`}
          name={transcriptName}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="font-chinese min-h-32"
          placeholder={"A: 你好！你叫什么名字？\nB: 我叫王芳。你呢？"}
        />
        <p className="text-xs text-muted-foreground">
          Mẹo: dùng nhãn <code className="font-mono">A:</code> / <code className="font-mono">B:</code> đầu dòng cho
          hội thoại — hệ thống sẽ tách câu, đổi giọng A/B và dò “đáp án nằm ở câu nào”.
        </p>
      </div>

      {/* Audio */}
      <div className="space-y-2">
        <Label>Audio bài nghe</Label>

        {audioUrl ? (
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Music2 className="h-4 w-4 text-teal-600" /> Audio hiện tại
            </div>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio controls src={audioUrl} className="w-full" />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
              >
                <Replace className="h-3.5 w-3.5" /> Đổi tệp khác
              </button>
              <button
                type="button"
                onClick={() => setAudioUrl("")}
                className="inline-flex items-center gap-1 text-xs font-medium text-destructive transition hover:opacity-80"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xoá audio
              </button>
            </div>
          </div>
        ) : (
          <label
            htmlFor={fieldId}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) uploadFile(file);
            }}
            className={cn(
              "flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed bg-muted/20 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
            )}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
            )}
            <div className="text-sm font-medium">
              {uploading ? "Đang tải lên..." : "Kéo thả file MP3 vào đây hoặc bấm để chọn"}
            </div>
            <div className="text-xs text-muted-foreground">MP3, WAV, OGG, M4A · tối đa 20MB</div>
          </label>
        )}

        <input
          id={fieldId}
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
            e.target.value = "";
          }}
        />

        {/* Generate + URL fallback */}
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          <button
            type="button"
            onClick={generateFromTranscript}
            disabled={busy || !transcript.trim()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Đang tạo MP3…" : "Tạo MP3 từ transcript (Voxtral)"}
          </button>
          <button
            type="button"
            onClick={() => setShowUrl((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Link2 className="h-3.5 w-3.5" /> {showUrl ? "Ẩn" : "Hoặc dán liên kết audio"}
          </button>
        </div>
        {showUrl && (
          <Input
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://... hoặc /audio/..."
            className="text-sm"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Voxtral hỗ trợ chính thức 9 ngôn ngữ (chưa có tiếng Trung) nên giọng đọc Hán tự là “best-effort”. Nếu bài
          không có MP3, người học vẫn nghe được nhờ giọng đọc tiếng Trung của trình duyệt.
        </p>
      </div>
    </div>
  );
}
