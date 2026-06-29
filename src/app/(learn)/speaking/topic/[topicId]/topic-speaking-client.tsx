"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { emitBao } from "@/lib/bao-bus";
import { hskLevelLabel } from "@/lib/utils";
import { gradeSpeakingTopicAction } from "@/server/actions/speaking";
import type { TopicHint } from "@/components/admin/speaking-topic-fields";
import type { SpeakingTopicGradeResult } from "@/lib/groq";
import {
  Mic,
  Square,
  Loader2,
  Volume2,
  Lightbulb,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Timer,
  CheckCircle2,
  AlertCircle,
  Quote,
  Gauge,
  ListTree,
} from "lucide-react";
import type { HSKLevel } from "@prisma/client";

export interface TopicData {
  id: string;
  hskLevel: HSKLevel;
  title: string;
  topic: string;
  questionZh: string;
  questionPinyin: string | null;
  questionVi: string | null;
  outline: string | null;
  audioUrl: string | null;
  transcript: string | null;
  hints: TopicHint[];
  sampleAnswer: string | null;
  sampleAnswerPinyin: string | null;
  minChars: number;
  prepSeconds: number;
}

type Phase = "idle" | "recording" | "grading" | "done";

// ----- helpers -----

function scoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-600", bar: "bg-emerald-500", ring: "#10b981" };
  if (score >= 60) return { text: "text-amber-600", bar: "bg-amber-500", ring: "#f59e0b" };
  return { text: "text-rose-600", bar: "bg-rose-500", ring: "#f43f5e" };
}

/** Đếm số tăng dần (count-up) khi hiện điểm. */
function CountUp({ to, duration = 900 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{val}</>;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Chọn mimeType MediaRecorder hỗ trợ. Safari/iOS không nhận "audio/webm" và sẽ NÉM
 * lỗi nếu ép — trả về mp4 cho Safari, undefined để trình duyệt tự chọn mặc định.
 * Downstream (Deepgram tự dò container, Whisper suy theo Content-Type) đều ổn với mp4.
 */
function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const c of ["audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return undefined;
}

/** Phát câu hỏi: ưu tiên MP3 admin tải lên; thiếu thì đọc bằng giọng zh-CN trình duyệt. */
function useQuestionAudio(audioUrl: string | null, questionZh: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function play() {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onended = () => setPlaying(false);
        // Không có handler lỗi thì indicator "đang phát" kẹt mãi khi tệp lỗi.
        audioRef.current.onerror = () => setPlaying(false);
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return;
    }
    // Web Speech fallback (zh-CN)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(questionZh);
      u.lang = "zh-CN";
      u.rate = 0.95;
      u.onend = () => setPlaying(false);
      u.onerror = () => setPlaying(false); // tránh kẹt trạng thái khi TTS lỗi
      setPlaying(true);
      window.speechSynthesis.speak(u);
    } else {
      toast.error("Trình duyệt không hỗ trợ đọc giọng tiếng Trung.");
    }
  }

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  return { play, playing };
}

// ----- recorder -----

function TopicRecorder({
  phase,
  onRecorded,
  onStateChange,
}: {
  phase: Phase;
  onRecorded: (blob: Blob, durationSec: number) => void;
  onStateChange: (recording: boolean) => void;
}) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const recording = phase === "recording";

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Không thể truy cập microphone");
      return;
    }
    try {
      streamRef.current = stream;
      const mime = pickRecorderMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const type = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunks.current, { type });
        const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onRecorded(blob, durationSec);
      };
      startedAt.current = Date.now();
      mr.start();
      mediaRecorder.current = mr;
      setElapsed(0);
      timer.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      }, 250);
      onStateChange(true);
    } catch {
      // MediaRecorder constructor có thể ném (vd codec không hỗ trợ) → giải phóng mic.
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      toast.error("Trình duyệt không hỗ trợ ghi âm. Hãy thử Chrome hoặc Safari mới.");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    mediaRecorder.current?.stop();
    onStateChange(false);
  }

  // Rời trang khi đang ghi → dừng mic để không kẹt đèn micro / rò tài nguyên.
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const disabled = phase === "grading";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-28 w-28 items-center justify-center">
        {recording && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-rose-500/30"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-rose-500/20"
              animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
          </>
        )}
        <motion.button
          type="button"
          onClick={recording ? stop : start}
          disabled={disabled}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: disabled ? 1 : 1.04 }}
          className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:opacity-50 ${
            recording ? "bg-rose-500" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          aria-label={recording ? "Dừng ghi âm" : "Bắt đầu ghi âm"}
        >
          {phase === "grading" ? (
            <Loader2 className="h-9 w-9 animate-spin" />
          ) : recording ? (
            <Square className="h-9 w-9" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </motion.button>
      </div>
      <div className="text-center" role="status" aria-live="polite">
        {recording ? (
          <div className="font-mono text-lg font-bold text-rose-600">
            <span className="sr-only">Đang ghi âm </span>
            {fmtTime(elapsed)}
          </div>
        ) : (
          <div className="text-sm font-medium text-muted-foreground">
            {phase === "grading" ? "Đang chấm bài…" : "Bấm để ghi âm trả lời"}
          </div>
        )}
      </div>
    </div>
  );
}

// ----- collapsible -----

function Collapsible({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold"
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----- result axes -----

const AXES: { key: keyof SpeakingTopicGradeResult["criteria"]; label: string; zh: string }[] = [
  { key: "content", label: "Nội dung", zh: "内容" },
  { key: "grammar", label: "Ngữ pháp", zh: "语法" },
  { key: "vocabulary", label: "Từ vựng", zh: "词汇" },
  { key: "coherence", label: "Mạch lạc", zh: "连贯" },
  { key: "delivery", label: "Lưu loát", zh: "流利度" },
];

function AxisBar({ label, zh, score, index }: { label: string; zh: string; score: number; index: number }) {
  const c = scoreColor(score);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {label} <span className="font-chinese text-xs text-muted-foreground">{zh}</span>
        </span>
        <span className={`font-bold ${c.text}`}>{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className={`h-full rounded-full ${c.bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.7, delay: 0.2 + index * 0.1, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ----- main -----

export function TopicSpeakingClient({ topic }: { topic: TopicData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SpeakingTopicGradeResult | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [prepLeft, setPrepLeft] = useState(0);
  const { play, playing } = useQuestionAudio(topic.audioUrl, topic.questionZh);

  // Prep countdown — báo khi hết giờ chuẩn bị để học viên bắt đầu ghi âm.
  useEffect(() => {
    if (prepLeft <= 0) return;
    const id = setInterval(() => {
      setPrepLeft((p) => {
        if (p <= 1) {
          toast.info("Hết giờ chuẩn bị — hãy bấm ghi âm và trả lời nhé!");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [prepLeft]);

  async function handleRecorded(blob: Blob, durationSec: number) {
    setPhase("grading");
    emitBao("thinking");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      if (!tRes.ok) {
        const err = (await tRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Không thể chuyển giọng nói thành văn bản");
      }
      const { transcript } = (await tRes.json()) as { transcript: string };
      if (!transcript.trim()) throw new Error("Không nghe rõ giọng nói, hãy thử ghi âm lại.");

      const res = await gradeSpeakingTopicAction({ topicId: topic.id, transcript, durationSec });
      if (!res.ok || !res.result) throw new Error(res.error || "Chấm điểm thất bại");
      const graded = res.result as SpeakingTopicGradeResult;
      setResult(graded);
      setPhase("done");
      emitBao(graded.score >= 80 ? "celebrate" : "complete");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chấm điểm");
      setPhase("idle");
    }
  }

  function reset() {
    setResult(null);
    setPhase("idle");
  }

  const good = (result?.score ?? 0) >= 80;
  const c = result ? scoreColor(result.score) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/speaking" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Luyện nói
        </Link>
        <Badge variant="outline">{hskLevelLabel(topic.hskLevel)}</Badge>
      </div>

      {/* Topic banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 to-white p-5 dark:from-indigo-500/10 dark:to-transparent">
        <div className="flex items-start gap-4">
          <BaoBuddy size={70} pose={good ? "cheer" : "idle"} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wide text-indigo-500">Nói theo chủ đề · HSKK</div>
            <h1 className="mt-0.5 text-lg font-extrabold">{topic.topic || topic.title || "Trả lời theo chủ đề"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Nghe câu hỏi của giám khảo, rồi ghi âm trả lời thành một đoạn dài. AI sẽ chấm chi tiết và sửa lỗi.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 -top-6 select-none font-chinese text-[110px] leading-none text-black/[0.04] dark:text-white/[0.04]">
          说
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button onClick={play} size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Volume2 className={`h-4 w-4 ${playing ? "animate-pulse" : ""}`} /> Nghe câu hỏi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowPinyin((v) => !v)}>
            {showPinyin ? "Ẩn" : "Hiện"} pinyin
          </Button>
          {topic.questionVi && (
            <Button variant="outline" size="sm" onClick={() => setShowVi((v) => !v)}>
              {showVi ? "Ẩn" : "Hiện"} dịch
            </Button>
          )}
          {!topic.audioUrl && (
            <span className="text-xs text-muted-foreground">(Giọng đọc trình duyệt — chưa có MP3)</span>
          )}
        </div>
        <div className="font-chinese text-2xl font-semibold leading-relaxed">{topic.questionZh}</div>
        {showPinyin && topic.questionPinyin && (
          <div className="font-pinyin mt-1 text-muted-foreground">{topic.questionPinyin}</div>
        )}
        {showVi && topic.questionVi && <div className="mt-2 text-sm text-muted-foreground">{topic.questionVi}</div>}

        {/* Outline (gợi ý dàn ý bài nói) */}
        {topic.outline?.trim() && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowOutline((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <ListTree className="h-4 w-4" /> {showOutline ? "Ẩn dàn ý" : "Gợi ý dàn ý"}
            </button>
            <AnimatePresence initial={false}>
              {showOutline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-emerald-900 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {topic.outline}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Hints */}
        {topic.hints.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowHints((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
            >
              <Lightbulb className="h-4 w-4" /> {showHints ? "Ẩn gợi ý" : "Xem gợi ý"}
            </button>
            <AnimatePresence initial={false}>
              {showHints && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex flex-wrap gap-2">
                    {topic.hints.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border bg-muted/40 px-3 py-2"
                      >
                        {h.text && <span className="font-chinese font-medium">{h.text}</span>}
                        {h.pinyin && <span className="font-pinyin ml-1 text-xs text-muted-foreground">{h.pinyin}</span>}
                        {h.vi && <div className="text-xs text-muted-foreground">{h.vi}</div>}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {(topic.minChars > 0 || topic.prepSeconds > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {topic.minChars > 0 && (
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5" /> Nên nói ≥ {topic.minChars} chữ
              </span>
            )}
            {topic.prepSeconds > 0 && (
              <button
                type="button"
                onClick={() => setPrepLeft(topic.prepSeconds)}
                disabled={prepLeft > 0 || phase !== "idle"}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 font-medium transition hover:bg-muted disabled:opacity-60"
              >
                <Timer className="h-3.5 w-3.5" />
                {prepLeft > 0 ? `Chuẩn bị: ${prepLeft}s` : `Chuẩn bị ${topic.prepSeconds}s`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recorder / loading */}
      {phase !== "done" && (
        <div className="rounded-2xl border bg-card p-6 shadow-soft">
          <TopicRecorder
            phase={phase}
            onRecorded={handleRecorded}
            onStateChange={(rec) => setPhase(rec ? "recording" : "grading")}
          />
          {phase === "grading" && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <BaoBuddy size={64} pose="idle" message="Để Bao chấm nhé…" />
            </div>
          )}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {phase === "done" && result && c && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* Score header */}
            <div className="relative overflow-hidden rounded-2xl border bg-card p-6 text-center shadow-soft">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="flex flex-col items-center"
              >
                <BaoBuddy size={84} pose={good ? "cheer" : "idle"} message={good ? "Tuyệt vời!" : "Cố lên nhé!"} />
                <div className={`mt-2 text-6xl font-extrabold ${c.text}`}>
                  <CountUp to={result.score} />
                  <span className="text-2xl text-muted-foreground">/100</span>
                </div>
                <div className="mt-1 text-sm font-semibold text-muted-foreground">{result.bandLabel}</div>
              </motion.div>
            </div>

            {/* Axes */}
            <div className="grid gap-3 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2">
              {AXES.map((a, i) => (
                <AxisBar key={a.key} label={a.label} zh={a.zh} score={result.criteria[a.key].score} index={i} />
              ))}
              <div className="flex items-center gap-1 text-xs text-muted-foreground sm:col-span-2">
                <Gauge className="h-3.5 w-3.5" /> Đã nói {result.charCount} chữ
                {result.criteria.delivery.wordsPerMinute > 0 &&
                  ` · ~${result.criteria.delivery.wordsPerMinute} chữ/phút`}
              </div>
            </div>

            {/* Overall feedback */}
            {result.overallFeedback && (
              <div className="rounded-2xl border bg-indigo-50/60 p-4 text-sm dark:bg-indigo-500/10">
                <div className="mb-1 flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
                  <Sparkles className="h-4 w-4" /> Nhận xét của AI
                </div>
                <p className="text-muted-foreground">{result.overallFeedback}</p>
              </div>
            )}

            {/* Strengths + improvements */}
            {(result.strengths.length > 0 || result.improvements.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {result.strengths.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-400/25 dark:bg-emerald-500/10">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" /> Điểm mạnh
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.strengths.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-emerald-500">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.improvements.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-400/25 dark:bg-amber-500/10">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
                      <AlertCircle className="h-4 w-4" /> Cần cải thiện
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {result.improvements.map((s, i) => (
                        <li key={i} className="flex gap-1.5">
                          <span className="text-amber-500">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Recognized transcript */}
            <Collapsible
              title="Lời bạn đã nói (máy nhận dạng)"
              icon={<Quote className="h-4 w-4 text-muted-foreground" />}
              defaultOpen
            >
              <p className="font-chinese leading-relaxed">{result.transcript}</p>
            </Collapsible>

            {/* Detailed corrections */}
            {result.annotations.length > 0 && (
              <Collapsible
                title={`Sửa lỗi chi tiết (${result.annotations.length})`}
                icon={<AlertCircle className="h-4 w-4 text-rose-500" />}
                defaultOpen
              >
                <div className="space-y-3">
                  {result.annotations.map((a, i) => (
                    <div key={i} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex flex-wrap items-center gap-2 font-chinese">
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700 line-through dark:bg-rose-500/15 dark:text-rose-300">{a.original}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {a.correction}
                        </span>
                        {a.type && <Badge variant="outline" className="font-chinese text-[11px]">{a.type}</Badge>}
                      </div>
                      {a.explanation && <p className="mt-1.5 text-sm text-muted-foreground">{a.explanation}</p>}
                    </div>
                  ))}
                </div>
              </Collapsible>
            )}

            {/* Corrected version */}
            {result.correctedVersion && result.correctedVersion !== result.transcript && (
              <Collapsible title="Bản sửa hoàn chỉnh" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}>
                <p className="font-chinese leading-relaxed">{result.correctedVersion}</p>
              </Collapsible>
            )}

            {/* Sample answers */}
            {topic.sampleAnswer && (
              <Collapsible title="Bài trả lời mẫu (tham khảo)" icon={<Sparkles className="h-4 w-4 text-indigo-500" />}>
                <p className="font-chinese leading-relaxed">{topic.sampleAnswer}</p>
                {topic.sampleAnswerPinyin && (
                  <p className="font-pinyin mt-2 text-sm text-muted-foreground">{topic.sampleAnswerPinyin}</p>
                )}
              </Collapsible>
            )}
            {result.sampleAnswer && (
              <Collapsible title="AI gợi ý cách nói hay hơn" icon={<Sparkles className="h-4 w-4 text-violet-500" />}>
                <p className="font-chinese leading-relaxed">{result.sampleAnswer}</p>
              </Collapsible>
            )}

            {/* Examiner transcript reveal */}
            {topic.transcript && (
              <Collapsible title="Lời giám khảo (transcript)" icon={<Quote className="h-4 w-4 text-muted-foreground" />}>
                <p className="font-chinese leading-relaxed">{topic.transcript}</p>
              </Collapsible>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={reset} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <RotateCcw className="h-4 w-4" /> Thử lại
              </Button>
              <Link href="/speaking">
                <Button variant="outline">Về danh sách</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
