"use client";
import { useId, useRef, useState } from "react";
import {
  Loader2,
  Trash2,
  Link2,
  UploadCloud,
  Music2,
  Replace,
  FileAudio,
  Plus,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { transcribeListeningAudioAction } from "@/server/actions/admin";

export interface TopicHint {
  text?: string;
  pinyin?: string;
  vi?: string;
}

interface SpeakingTopicFieldsProps {
  /** Hidden input name for the examiner MP3 URL. */
  audioName?: string;
  /** Textarea input name for the examiner-question transcript. */
  transcriptName?: string;
  /** Hidden input name for the serialized hints JSON. */
  hintsName?: string;
  defaultAudioUrl?: string | null;
  defaultTranscript?: string | null;
  defaultHints?: TopicHint[];
  /** Unique suffix so the create + edit forms don't collide on element ids. */
  idSuffix?: string;
}

/**
 * Admin editor cho phần audio + transcript + gợi ý của một bài "Nói theo chủ đề".
 * Một client component để các nút AI đọc/ghi được giá trị transcript đang nhập.
 * Submit kèm <form> server-action: `audioUrl` (hidden) + `transcript` (textarea)
 * + `hints` (hidden JSON từ bộ lặp gợi ý).
 *
 *  - Tải MP3 giám khảo hỏi → POST /api/admin/audio (admin tự thu/đọc, KHÔNG dùng TTS).
 *  - Audio → transcript: Deepgram ghi lại lời giám khảo (dùng lại action của bài nghe;
 *    chỉ cần URL audio nên dùng được cả khi đang tạo mới).
 *  - Hoặc dán liên kết audio trực tiếp (CDN/lưu trữ bền).
 */
export function SpeakingTopicFields({
  audioName = "audioUrl",
  transcriptName = "transcript",
  hintsName = "hints",
  defaultAudioUrl,
  defaultTranscript,
  defaultHints,
  idSuffix = "",
}: SpeakingTopicFieldsProps) {
  const [audioUrl, setAudioUrl] = useState(defaultAudioUrl ?? "");
  const [transcript, setTranscript] = useState(defaultTranscript ?? "");
  const [hints, setHints] = useState<TopicHint[]>(
    defaultHints && defaultHints.length ? defaultHints : [{ text: "", pinyin: "", vi: "" }],
  );
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldId = `${useId()}${idSuffix}`;
  const busy = uploading || transcribing;

  // Chỉ gửi gợi ý có nội dung (bỏ dòng trống). Server cũng lọc lại lần nữa.
  const hintsJson = JSON.stringify(
    hints.filter((h) => (h.text || "").trim() || (h.pinyin || "").trim() || (h.vi || "").trim()),
  );

  function setHint(i: number, patch: Partial<TopicHint>) {
    setHints((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function addHint() {
    setHints((prev) => [...prev, { text: "", pinyin: "", vi: "" }]);
  }
  function removeHint(i: number) {
    setHints((prev) => (prev.length <= 1 ? [{ text: "", pinyin: "", vi: "" }] : prev.filter((_, idx) => idx !== i)));
  }

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

  return (
    <div className="space-y-4">
      {/* Hidden submitted values */}
      <input type="hidden" name={audioName} value={audioUrl} />
      <input type="hidden" name={hintsName} value={hintsJson} />

      {/* Audio */}
      <div className="space-y-2">
        <Label>Audio giám khảo hỏi (MP3)</Label>

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
          Tự thu/đọc câu hỏi rồi tải MP3 thật lên (như giám khảo HSKK hỏi). Thiếu MP3 thì học viên vẫn
          nghe được nhờ giọng đọc tiếng Trung của trình duyệt.
        </p>
      </div>

      {/* Transcript */}
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-transcript`}>Transcript lời giám khảo (tiếng Trung)</Label>
        <Textarea
          id={`${fieldId}-transcript`}
          name={transcriptName}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="font-chinese min-h-20"
          placeholder={"请说说你的爱好。"}
        />
        <div className="pt-0.5">
          <button
            type="button"
            onClick={generateTranscriptFromAudio}
            disabled={busy || !audioUrl.trim()}
            title={!audioUrl.trim() ? "Cần có audio ở trên trước" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}
            {transcribing ? "Đang tạo transcript…" : "Tạo transcript từ audio (Deepgram)"}
          </button>
          <span className="ml-2 text-xs text-muted-foreground">
            Hệ thống dùng transcript này làm ngữ cảnh khi AI chấm bài.
          </span>
        </div>
      </div>

      {/* Hints */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Gợi ý cho học viên (từ/cụm nên dùng)
        </Label>
        <div className="space-y-2">
          {hints.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input
                  value={h.text ?? ""}
                  onChange={(e) => setHint(i, { text: e.target.value })}
                  placeholder="Chữ Hán (vd 旅游)"
                  className="font-chinese text-sm"
                />
                <Input
                  value={h.pinyin ?? ""}
                  onChange={(e) => setHint(i, { pinyin: e.target.value })}
                  placeholder="Pinyin (lǚyóu)"
                  className="font-pinyin text-sm"
                />
                <Input
                  value={h.vi ?? ""}
                  onChange={(e) => setHint(i, { vi: e.target.value })}
                  placeholder="Nghĩa / ý gợi (du lịch)"
                  className="text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeHint(i)}
                className="mt-1 text-muted-foreground transition hover:text-destructive"
                aria-label="Xoá gợi ý"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addHint}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition hover:opacity-80"
        >
          <Plus className="h-4 w-4" /> Thêm gợi ý
        </button>
        <p className="text-xs text-muted-foreground">
          Mỗi dòng là một gợi ý — điền ô nào cũng được (chỉ chữ Hán, hoặc thêm pinyin + nghĩa).
        </p>
      </div>
    </div>
  );
}
