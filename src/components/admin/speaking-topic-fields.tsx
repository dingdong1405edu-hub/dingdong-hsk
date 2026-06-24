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
  Braces,
  ClipboardCopy,
  Wand2,
  ListTree,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/admin/image-upload";
import { cn } from "@/lib/utils";
import { transcribeListeningAudioAction } from "@/server/actions/admin";

export interface TopicHint {
  text?: string;
  pinyin?: string;
  vi?: string;
}

const HSK_LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

export interface TopicFormDefaults {
  title?: string;
  hskLevel?: string;
  topic?: string;
  questionZh?: string;
  questionPinyin?: string | null;
  questionVi?: string | null;
  outline?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
  hints?: TopicHint[];
  sampleAnswer?: string | null;
  sampleAnswerPinyin?: string | null;
  minChars?: number;
  prepSeconds?: number;
  order?: number;
  imageUrl?: string | null;
}

// Mẫu JSON dùng cho cả phần hướng dẫn lẫn nút "Chép mẫu". MP3 + ảnh KHÔNG nằm
// trong JSON — admin tải tệp riêng ở dưới.
const TEMPLATE = {
  title: "HSKK HSK3 — Sở thích",
  hskLevel: "HSK3",
  topic: "爱好 — Sở thích",
  questionZh: "请谈谈你的爱好，并说明原因。",
  questionPinyin: "Qǐng tántan nǐ de àihào, bìng shuōmíng yuányīn.",
  questionVi: "Hãy nói về sở thích của bạn và giải thích lý do.",
  transcript: "请谈谈你的爱好，并说明原因。",
  outline: "1. Sở thích của bạn là gì\n2. Vì sao bạn thích\n3. Tần suất / một kỷ niệm\n4. Cảm nghĩ, kết luận",
  hints: [
    { text: "旅游", pinyin: "lǚyóu", vi: "du lịch" },
    { text: "放松心情", pinyin: "fàngsōng xīnqíng", vi: "thư giãn tinh thần" },
  ],
  sampleAnswer: "我的爱好是旅游。每次旅游我都觉得很放松，也能认识新朋友。我每年都会去旅游一两次。",
  minChars: 80,
  prepSeconds: 10,
  order: 1,
};
const TEMPLATE_JSON = JSON.stringify(TEMPLATE, null, 2);

/**
 * Form đầy đủ (controlled) cho một bài "Nói theo chủ đề". Hai cách điền:
 *  1) Dán JSON: dán 1 object cho TẤT CẢ trường chữ → bấm "Áp dụng" → tự điền vào form.
 *  2) Gõ tay từng ô như thường.
 * MP3 (giám khảo hỏi) và ảnh đại diện luôn tải tệp riêng (không nằm trong JSON).
 * Submit qua server action (`action`); mọi giá trị gửi kèm theo `name` của input.
 */
export function SpeakingTopicForm({
  action,
  defaults,
  id,
  submitLabel = "Lưu",
  idSuffix = "",
}: {
  action: (fd: FormData) => void | Promise<void>;
  defaults?: TopicFormDefaults;
  id?: string;
  submitLabel?: string;
  idSuffix?: string;
}) {
  const d = defaults;
  const [title, setTitle] = useState(d?.title ?? "");
  const [hskLevel, setHskLevel] = useState(d?.hskLevel ?? "HSK3");
  const [topic, setTopic] = useState(d?.topic ?? "");
  const [questionZh, setQuestionZh] = useState(d?.questionZh ?? "");
  const [questionPinyin, setQuestionPinyin] = useState(d?.questionPinyin ?? "");
  const [questionVi, setQuestionVi] = useState(d?.questionVi ?? "");
  const [outline, setOutline] = useState(d?.outline ?? "");
  const [transcript, setTranscript] = useState(d?.transcript ?? "");
  const [audioUrl, setAudioUrl] = useState(d?.audioUrl ?? "");
  const [hints, setHints] = useState<TopicHint[]>(
    d?.hints && d.hints.length ? d.hints : [{ text: "", pinyin: "", vi: "" }],
  );
  const [sampleAnswer, setSampleAnswer] = useState(d?.sampleAnswer ?? "");
  const [sampleAnswerPinyin, setSampleAnswerPinyin] = useState(d?.sampleAnswerPinyin ?? "");
  const [minChars, setMinChars] = useState(String(d?.minChars ?? 0));
  const [prepSeconds, setPrepSeconds] = useState(String(d?.prepSeconds ?? 0));
  const [order, setOrder] = useState(String(d?.order ?? 0));

  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldId = `${useId()}${idSuffix}`;
  const busy = uploading || transcribing;

  const cleanHints = hints.filter(
    (h) => (h.text || "").trim() || (h.pinyin || "").trim() || (h.vi || "").trim(),
  );

  function setHint(i: number, patch: Partial<TopicHint>) {
    setHints((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));
  }
  function addHint() {
    setHints((prev) => [...prev, { text: "", pinyin: "", vi: "" }]);
  }
  function removeHint(i: number) {
    setHints((prev) =>
      prev.length <= 1 ? [{ text: "", pinyin: "", vi: "" }] : prev.filter((_, idx) => idx !== i),
    );
  }

  // ----- JSON bulk fill -----
  function applyJson() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.error("JSON không hợp lệ — kiểm tra lại dấu ngoặc { } và dấu phẩy.");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      toast.error("JSON phải là một object { ... }");
      return;
    }
    const p = parsed as Record<string, unknown>;
    const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : undefined);
    const numStr = (k: string) => {
      const v = p[k];
      if (typeof v === "number" && Number.isFinite(v)) return String(v);
      if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return String(Number(v));
      return undefined;
    };

    if (str("title") !== undefined) setTitle(str("title")!);
    if (typeof p.hskLevel === "string" && HSK_LEVELS.includes(p.hskLevel)) setHskLevel(p.hskLevel);
    if (str("topic") !== undefined) setTopic(str("topic")!);
    // chấp nhận cả "question" làm bí danh của questionZh
    if (str("questionZh") !== undefined) setQuestionZh(str("questionZh")!);
    else if (str("question") !== undefined) setQuestionZh(str("question")!);
    if (str("questionPinyin") !== undefined) setQuestionPinyin(str("questionPinyin")!);
    if (str("questionVi") !== undefined) setQuestionVi(str("questionVi")!);
    if (str("outline") !== undefined) setOutline(str("outline")!);
    if (str("transcript") !== undefined) setTranscript(str("transcript")!);
    if (str("audioUrl") !== undefined) setAudioUrl(str("audioUrl")!);
    if (str("sampleAnswer") !== undefined) setSampleAnswer(str("sampleAnswer")!);
    if (str("sampleAnswerPinyin") !== undefined) setSampleAnswerPinyin(str("sampleAnswerPinyin")!);
    if (numStr("minChars") !== undefined) setMinChars(numStr("minChars")!);
    if (numStr("prepSeconds") !== undefined) setPrepSeconds(numStr("prepSeconds")!);
    if (numStr("order") !== undefined) setOrder(numStr("order")!);
    if (Array.isArray(p.hints)) {
      const hs: TopicHint[] = p.hints
        .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
        .map((h) => ({
          text: typeof h.text === "string" ? h.text : "",
          pinyin: typeof h.pinyin === "string" ? h.pinyin : "",
          vi: typeof h.vi === "string" ? h.vi : "",
        }))
        .filter((h) => h.text || h.pinyin || h.vi);
      setHints(hs.length ? hs : [{ text: "", pinyin: "", vi: "" }]);
    }
    toast.success("Đã điền JSON vào form. Kiểm tra lại rồi tải MP3 và bấm lưu.");
  }

  function copyTemplate() {
    navigator.clipboard?.writeText(TEMPLATE_JSON).then(
      () => toast.success("Đã chép mẫu JSON vào clipboard"),
      () => toast.error("Không chép được — hãy bôi đen mẫu bên dưới và tự sao chép."),
    );
  }

  // ----- audio upload + transcript -----
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
    <form action={action} className="space-y-4">
      {id && <input type="hidden" name="id" value={id} />}
      <input type="hidden" name="audioUrl" value={audioUrl} />
      <input type="hidden" name="hints" value={JSON.stringify(cleanHints)} />

      {/* JSON quick-fill */}
      <div className="rounded-xl border border-violet-200 bg-violet-50/40">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-violet-700"
        >
          <Braces className="h-4 w-4" /> Điền nhanh bằng JSON (dán 1 lần cho mọi ô chữ)
        </button>
        {showJson && (
          <div className="space-y-3 border-t border-violet-200 p-3">
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='Dán JSON vào đây, ví dụ: {"title":"...","hskLevel":"HSK3","questionZh":"...", ...}'
              className="min-h-32 font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={applyJson} className="gap-1 bg-violet-600 hover:bg-violet-700">
                <Wand2 className="h-4 w-4" /> Áp dụng vào form
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setJsonText(TEMPLATE_JSON)} className="gap-1">
                <ClipboardCopy className="h-4 w-4" /> Dán mẫu vào ô
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={copyTemplate} className="gap-1">
                <ClipboardCopy className="h-4 w-4" /> Chép mẫu
              </Button>
            </div>

            {/* Guide */}
            <details className="rounded-lg border bg-white/70 p-2 text-xs">
              <summary className="cursor-pointer font-medium text-violet-700">Hướng dẫn viết JSON</summary>
              <div className="mt-2 space-y-2 text-muted-foreground">
                <p>
                  Dán một <b>object</b> JSON. Các khoá hỗ trợ (đều không bắt buộc trừ <code>questionZh</code>):
                </p>
                <ul className="ml-4 list-disc space-y-0.5">
                  <li><code>title</code>, <code>topic</code> — chuỗi (tiêu đề nội bộ, nhãn chủ đề).</li>
                  <li><code>hskLevel</code> — một trong HSK1…HSK6.</li>
                  <li><code>questionZh</code> (bắt buộc), <code>questionPinyin</code>, <code>questionVi</code> — câu hỏi + pinyin + dịch.</li>
                  <li><code>transcript</code> — lời giám khảo (tiếng Trung); cũng có thể bấm “Tạo transcript từ audio”.</li>
                  <li><code>outline</code> — dàn ý gợi ý, mỗi ý một dòng (dùng <code>\n</code> trong JSON).</li>
                  <li><code>hints</code> — mảng <code>{`[{ "text": "旅游", "pinyin": "lǚyóu", "vi": "du lịch" }]`}</code>.</li>
                  <li><code>sampleAnswer</code>, <code>sampleAnswerPinyin</code> — bài mẫu (tiếng Trung) + pinyin.</li>
                  <li><code>minChars</code>, <code>prepSeconds</code>, <code>order</code> — số.</li>
                </ul>
                <p>
                  <b>MP3</b> giám khảo hỏi và <b>ảnh</b> đại diện <u>không</u> nằm trong JSON — tải tệp riêng ở dưới.
                </p>
                <pre className="overflow-x-auto rounded bg-zinc-900 p-2 text-[11px] leading-snug text-zinc-100">
                  {TEMPLATE_JSON}
                </pre>
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Core fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Tiêu đề (nội bộ)</Label>
          <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="HSKK HSK3 — Sở thích" />
        </div>
        <div className="space-y-1">
          <Label>Cấp độ HSK</Label>
          <select
            name="hskLevel"
            value={hskLevel}
            onChange={(e) => setHskLevel(e.target.value)}
            className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
          >
            {HSK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Nhãn chủ đề (hiện cho học viên)</Label>
          <Input name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="爱好 — Sở thích" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>Thứ tự</Label>
            <Input name="order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Chuẩn bị (s)</Label>
            <Input name="prepSeconds" type="number" value={prepSeconds} onChange={(e) => setPrepSeconds(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tối thiểu (chữ)</Label>
            <Input name="minChars" type="number" value={minChars} onChange={(e) => setMinChars(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Câu hỏi (tiếng Trung) *</Label>
        <Textarea
          name="questionZh"
          value={questionZh}
          onChange={(e) => setQuestionZh(e.target.value)}
          className="font-chinese min-h-16"
          placeholder="请谈谈你的爱好，并说明原因。"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Pinyin câu hỏi</Label>
          <Input
            name="questionPinyin"
            value={questionPinyin ?? ""}
            onChange={(e) => setQuestionPinyin(e.target.value)}
            className="font-pinyin"
            placeholder="Qǐng tántan nǐ de àihào…"
          />
        </div>
        <div className="space-y-1">
          <Label>Dịch câu hỏi (tiếng Việt)</Label>
          <Input
            name="questionVi"
            value={questionVi ?? ""}
            onChange={(e) => setQuestionVi(e.target.value)}
            placeholder="Hãy nói về sở thích của bạn và giải thích lý do."
          />
        </div>
      </div>

      {/* Outline */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1.5">
          <ListTree className="h-4 w-4 text-emerald-600" /> Gợi ý dàn ý bài nói (mỗi ý một dòng)
        </Label>
        <Textarea
          name="outline"
          value={outline ?? ""}
          onChange={(e) => setOutline(e.target.value)}
          className="min-h-24"
          placeholder={"1. Sở thích của bạn là gì\n2. Vì sao bạn thích\n3. Tần suất / một kỷ niệm\n4. Cảm nghĩ, kết luận"}
        />
        <p className="text-xs text-muted-foreground">
          Học viên bấm “Gợi ý dàn ý” mới thấy. AI cũng dựa vào dàn ý này để thưởng điểm nội dung/mạch lạc khi bài bao quát đủ ý.
        </p>
      </div>

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
      </div>

      {/* Transcript */}
      <div className="space-y-1">
        <Label htmlFor={`${fieldId}-transcript`}>Transcript lời giám khảo (tiếng Trung)</Label>
        <Textarea
          id={`${fieldId}-transcript`}
          name="transcript"
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          className="font-chinese min-h-16"
          placeholder="请说说你的爱好。"
        />
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
      </div>

      {/* Hints */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Gợi ý từ/cụm nên dùng
        </Label>
        <div className="space-y-2">
          {hints.map((h, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-3">
                <Input
                  value={h.text ?? ""}
                  onChange={(e) => setHint(i, { text: e.target.value })}
                  placeholder="Chữ Hán (旅游)"
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
                  placeholder="Nghĩa (du lịch)"
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
      </div>

      {/* Sample answer */}
      <div className="space-y-1">
        <Label>Bài trả lời mẫu (tiếng Trung, tham khảo)</Label>
        <Textarea
          name="sampleAnswer"
          value={sampleAnswer ?? ""}
          onChange={(e) => setSampleAnswer(e.target.value)}
          className="font-chinese min-h-20"
          placeholder="我的爱好是旅游。我觉得旅游可以让我放松，还能认识新朋友…"
        />
      </div>
      <div className="space-y-1">
        <Label>Pinyin bài mẫu (tuỳ chọn)</Label>
        <Textarea
          name="sampleAnswerPinyin"
          value={sampleAnswerPinyin ?? ""}
          onChange={(e) => setSampleAnswerPinyin(e.target.value)}
          className="font-pinyin min-h-16"
        />
      </div>

      {/* Image */}
      <div className="space-y-1">
        <Label>Ảnh đại diện (tuỳ chọn)</Label>
        <ImageUpload name="imageUrl" defaultValue={d?.imageUrl ?? undefined} />
      </div>

      <Button type="submit" disabled={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}
