"use client";
import { useId, useRef, useState } from "react";
import { Loader2, Trash2, Link2, UploadCloud, Sparkles, Music2, Replace, FileAudio, Languages } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn, countChineseChars } from "@/lib/utils";
import {
  transcribeListeningAudioAction,
  generateTranscriptExplanationAction,
} from "@/server/actions/admin";

interface ListeningAudioFieldsProps {
  /** Hidden input name for the resulting audio URL. */
  audioName?: string;
  /** Textarea input name for the transcript. */
  transcriptName?: string;
  /** Textarea input name for the Vietnamese transcript explanation. */
  transcriptExplanationName?: string;
  defaultAudioUrl?: string | null;
  defaultTranscript?: string | null;
  defaultTranscriptExplanation?: string | null;
  /** Test id — required for the AI "dịch & giải thích" button (edit page only). */
  listeningId?: string;
  /** Unique suffix so two instances (create + edit) don't collide on element ids. */
  idSuffix?: string;
}

/**
 * Admin audio + transcript editor for a listening test. One client component so
 * the AI helpers can read/write the live transcript value. Submits three fields
 * with the surrounding server-action <form>: `audioUrl` (hidden) + `transcript`
 * + `transcriptExplanation`.
 *
 *  - Upload an MP3/WAV/OGG/M4A file → POST /api/admin/audio (file). (Admin tự tải
 *    audio thật — KHÔNG còn tạo MP3 bằng AI vì không có giọng TTS tiếng Trung.)
 *  - Audio → transcript: Deepgram transcribes the audio to Mandarin text.
 *  - Transcript → dịch & giải thích (tiếng Việt) via Groq, hiện ở phần chữa bài.
 *  - Or paste a direct URL (fallback for durable/CDN storage).
 */
export function ListeningAudioFields({
  audioName = "audioUrl",
  transcriptName = "transcript",
  transcriptExplanationName = "transcriptExplanation",
  defaultAudioUrl,
  defaultTranscript,
  defaultTranscriptExplanation,
  listeningId,
  idSuffix = "",
}: ListeningAudioFieldsProps) {
  const [audioUrl, setAudioUrl] = useState(defaultAudioUrl ?? "");
  const [transcript, setTranscript] = useState(defaultTranscript ?? "");
  const [explanation, setExplanation] = useState(defaultTranscriptExplanation ?? "");
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Suffix keeps element ids distinct when both the create + edit forms mount.
  const fieldId = `${useId()}${idSuffix}`;

  const charCount = countChineseChars(transcript);
  const busy = uploading || transcribing || explaining;

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

  async function generateTranscriptFromAudio() {
    if (!audioUrl.trim()) {
      toast.error("Hãy tải audio lên (hoặc dán liên kết) trước khi tạo transcript");
      return;
    }
    setTranscribing(true);
    try {
      const res = await transcribeListeningAudioAction(audioUrl);
      if (res.ok) {
        setTranscript(res.transcript);
        toast.success("Đã tạo transcript từ audio (Deepgram)");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Lỗi khi tạo transcript từ audio");
    } finally {
      setTranscribing(false);
    }
  }

  async function explainTranscript() {
    if (!listeningId) {
      toast.error("Hãy lưu bài nghe trước, rồi mới dịch lời thoại.");
      return;
    }
    if (!transcript.trim()) {
      toast.error("Hãy có lời thoại (transcript) trước khi dịch.");
      return;
    }
    setExplaining(true);
    try {
      const res = await generateTranscriptExplanationAction(listeningId);
      if (res.ok) {
        setExplanation(res.text);
        toast.success("Đã dịch & giải thích lời thoại (Groq)");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Lỗi khi dịch lời thoại");
    } finally {
      setExplaining(false);
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
        <div className="pt-0.5">
          <button
            type="button"
            onClick={generateTranscriptFromAudio}
            disabled={busy || !audioUrl.trim()}
            title={!audioUrl.trim() ? "Cần có audio ở dưới trước" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20",
            )}
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}
            {transcribing ? "Đang tạo transcript…" : "Tạo transcript từ audio (Deepgram)"}
          </button>
          <span className="ml-2 text-xs text-muted-foreground">Ghi lời thoại tiếng Trung từ file audio bên dưới.</span>
        </div>
      </div>

      {/* Audio */}
      <div className="space-y-2">
        <Label>Audio bài nghe</Label>

        {audioUrl ? (
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Music2 className="h-4 w-4 text-teal-600" /> Audio hiện tại
            </div>
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

        {/* URL fallback */}
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
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
            placeholder="https://... hoặc /api/files/..."
            className="text-sm"
          />
        )}
        <p className="text-xs text-muted-foreground">
          Tự tải file MP3 thật lên (giọng người/thu âm). Có thể bấm{" "}
          <span className="font-medium">Tạo transcript từ audio (Deepgram)</span> để máy tự ghi lời thoại. Nếu bài chưa
          có MP3, người học vẫn nghe được nhờ giọng đọc tiếng Trung của trình duyệt.
        </p>
      </div>

      {/* Transcript explanation (Vietnamese translation + notes) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={`${fieldId}-explain`}>Dịch &amp; giải thích lời thoại (tiếng Việt)</Label>
          <button
            type="button"
            onClick={explainTranscript}
            disabled={busy || !listeningId || !transcript.trim()}
            title={!listeningId ? "Lưu bài nghe trước đã" : !transcript.trim() ? "Cần có lời thoại trước" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300 dark:hover:bg-violet-500/20",
            )}
          >
            {explaining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {explaining ? "Đang dịch…" : "AI dịch & giải thích"}
          </button>
        </div>
        <Textarea
          id={`${fieldId}-explain`}
          name={transcriptExplanationName}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="min-h-28"
          placeholder={"Tóm tắt + bản dịch tiếng Việt + từ vựng. Bấm “AI dịch & giải thích” để tạo tự động rồi chỉnh lại."}
        />
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Languages className="h-3.5 w-3.5" /> Hiện ở phần chữa bài để học viên hiểu kỹ nội dung nghe.
          {!listeningId && " (Lưu bài nghe xong mới dùng được nút AI.)"}
        </p>
      </div>
    </div>
  );
}
