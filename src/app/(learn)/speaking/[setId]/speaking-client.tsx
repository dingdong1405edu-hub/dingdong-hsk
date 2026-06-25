"use client";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hskLevelLabel } from "@/lib/utils";
import { gradeSpeakingAction } from "@/server/actions/speaking";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import type { HSKLevel } from "@prisma/client";

interface SpeakingSetData {
  id: string;
  hskLevel: HSKLevel;
  title: string;
  part1Sentences: unknown;
  part2Passage: unknown;
  part3Questions: unknown;
}

interface GradeResult {
  score: number;
  criteria: {
    pronunciation: { score: number; errors: Array<{ word: string; issue: string; correct: string }> };
    tones: { score: number; errors: Array<{ word: string; expected: string; detected: string }> };
    fluency: { score: number; wordsPerMinute: number; feedback: string };
  };
  transcript: string;
  overallFeedback: string;
}

interface Sentence { text: string; pinyin: string }
interface Passage { text: string; pinyin: string }
interface QuestionItem { question: string; pinyin: string }

/** Hàm chấm một đoạn ghi âm — mặc định gọi gradeSpeakingAction; lộ trình truyền bản riêng. */
type GradeFn = (args: {
  transcript: string;
  referenceText: string | null;
  part: "repeat" | "read" | "answer";
  question: string | null;
  index: number;
  durationSec: number;
}) => Promise<{ ok: boolean; result?: unknown; error?: string }>;

function AudioRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob, durationSec: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

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
      // Safari/iOS không nhận "audio/webm" và ném lỗi nếu ép → để trình duyệt tự chọn.
      const mime = typeof MediaRecorder !== "undefined" &&
        ["audio/webm", "audio/mp4", "audio/ogg"].find((c) => MediaRecorder.isTypeSupported?.(c));
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: mr.mimeType || mime || "audio/webm" });
        const durationSec = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        onRecorded(blob, durationSec);
      };
      startedAt.current = Date.now();
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      toast.error("Trình duyệt không hỗ trợ ghi âm. Hãy thử Chrome hoặc Safari mới.");
    }
  }

  function stop() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  // Rời trang khi đang ghi → dừng mic để không kẹt đèn micro / rò tài nguyên.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return (
    <div className="relative inline-flex">
      {recording && (
        <motion.span
          className="absolute inset-0 rounded-md bg-rose-500/30"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <Button
        onClick={recording ? stop : start}
        disabled={disabled}
        variant={recording ? "destructive" : "default"}
        size="sm"
        className="relative"
      >
        {recording ? (
          <><Square className="h-4 w-4 mr-2" /> Dừng</>
        ) : (
          <><Mic className="h-4 w-4 mr-2" /> Ghi âm</>
        )}
      </Button>
    </div>
  );
}

async function transcribeAndGrade(params: {
  blob: Blob;
  durationSec: number;
  grade: GradeFn;
  referenceText: string | null;
  part: "repeat" | "read" | "answer";
  question: string | null;
  index: number;
}): Promise<GradeResult> {
  const { blob, durationSec, grade, referenceText, part, question, index } = params;

  // 1) Audio → transcript via Deepgram (multipart upload stays an API route).
  const fd = new FormData();
  fd.append("audio", blob, "recording.webm");
  const transcribeRes = await fetch("/api/transcribe", { method: "POST", body: fd });
  if (!transcribeRes.ok) {
    const err = (await transcribeRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Không thể chuyển giọng nói thành văn bản");
  }
  const { transcript } = (await transcribeRes.json()) as { transcript: string };
  if (!transcript.trim()) {
    throw new Error("Không nghe rõ giọng nói, hãy thử ghi âm lại.");
  }

  // 2) Transcript → score via Groq, persisted as an Attempt (server action).
  const res = await grade({ transcript, referenceText, part, question, index, durationSec });
  if (!res.ok || !res.result) {
    throw new Error(res.error || "Chấm điểm thất bại");
  }
  return res.result as GradeResult;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-700 dark:text-green-300" : score >= 60 ? "text-yellow-700 dark:text-yellow-300" : "text-red-600 dark:text-red-400";
  return (
    <motion.span
      key={score}
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 14 }}
      className={`font-bold text-2xl ${color}`}
    >
      {score}
    </motion.span>
  );
}

export function SpeakingClient({
  set,
  gradeAction,
  onFinish,
}: {
  set: SpeakingSetData;
  userId?: string;
  /** Chấm tuỳ biến (lộ trình). Nếu có → dùng thay gradeSpeakingAction. */
  gradeAction?: GradeFn;
  /** Nút "Hoàn thành phần Nói" (lộ trình). Nếu có → hiện nút ghi nhận hoàn thành. */
  onFinish?: () => Promise<void> | void;
}) {
  const sentences = set.part1Sentences as Sentence[];
  const passage = set.part2Passage as Passage;
  const questions = set.part3Questions as QuestionItem[];

  const grade: GradeFn = gradeAction ?? ((args) => gradeSpeakingAction({ setId: set.id, ...args }));
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);

  async function handleFinish() {
    if (!onFinish) return;
    setFinishing(true);
    try {
      await onFinish();
      setFinished(true);
      toast.success("Đã hoàn thành phần Nói!");
    } catch {
      toast.error("Không ghi nhận được, thử lại sau.");
    } finally {
      setFinishing(false);
    }
  }

  const [part1Results, setPart1Results] = useState<(GradeResult | null)[]>(Array(sentences.length).fill(null));
  const [part1Loading, setPart1Loading] = useState<boolean[]>(Array(sentences.length).fill(false));
  const [part2Result, setPart2Result] = useState<GradeResult | null>(null);
  const [part2Loading, setPart2Loading] = useState(false);
  const [part3Results, setPart3Results] = useState<(GradeResult | null)[]>(Array(questions.length).fill(null));
  const [part3Loading, setPart3Loading] = useState<boolean[]>(Array(questions.length).fill(false));
  const [showPinyin, setShowPinyin] = useState(false);

  const anyHigh = [...part1Results, part2Result, ...part3Results].some((r) => r != null && r.score >= 80);

  async function gradePart1(idx: number, blob: Blob, durationSec: number) {
    setPart1Loading((l) => { const n = [...l]; n[idx] = true; return n; });
    try {
      const res = await transcribeAndGrade({
        blob, durationSec, grade, referenceText: sentences[idx].text,
        part: "repeat", question: null, index: idx,
      });
      setPart1Results((r) => { const n = [...r]; n[idx] = res; return n; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chấm điểm");
    } finally {
      setPart1Loading((l) => { const n = [...l]; n[idx] = false; return n; });
    }
  }

  async function gradePart2(blob: Blob, durationSec: number) {
    setPart2Loading(true);
    try {
      const res = await transcribeAndGrade({
        blob, durationSec, grade, referenceText: passage.text,
        part: "read", question: null, index: 0,
      });
      setPart2Result(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chấm điểm");
    } finally {
      setPart2Loading(false);
    }
  }

  async function gradePart3(idx: number, blob: Blob, durationSec: number) {
    setPart3Loading((l) => { const n = [...l]; n[idx] = true; return n; });
    try {
      const res = await transcribeAndGrade({
        blob, durationSec, grade, referenceText: null,
        part: "answer", question: questions[idx].question, index: idx,
      });
      setPart3Results((r) => { const n = [...r]; n[idx] = res; return n; });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lỗi chấm điểm");
    } finally {
      setPart3Loading((l) => { const n = [...l]; n[idx] = false; return n; });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-500/10 dark:to-transparent p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BaoBuddy size={60} pose={anyHigh ? "cheer" : "idle"} className="shrink-0" />
            <div>
              <h1 className="text-xl font-extrabold">Luyện nói HSKK</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Ghi âm · AI chấm phát âm, thanh điệu, lưu loát</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant="outline">{hskLevelLabel(set.hskLevel)}</Badge>
            <Button size="sm" variant="outline" onClick={() => setShowPinyin(!showPinyin)}>
              {showPinyin ? "Ẩn" : "Hiện"} pinyin
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 -top-6 select-none font-chinese text-[110px] leading-none text-black/[0.04] dark:text-white/[0.04]">
          说
        </div>
      </div>

      <Tabs defaultValue="part1">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="part1">Phần 1: Lặp câu</TabsTrigger>
          <TabsTrigger value="part2">Phần 2: Đọc</TabsTrigger>
          <TabsTrigger value="part3">Phần 3: Trả lời</TabsTrigger>
        </TabsList>

        {/* Part 1 */}
        <TabsContent value="part1" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nghe câu mẫu và lặp lại chính xác nhất có thể.
          </p>
          {sentences.map((s, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="font-chinese text-xl font-semibold">{s.text}</div>
                {showPinyin && <div className="font-pinyin text-muted-foreground">{s.pinyin}</div>}
                <div className="flex items-center gap-3">
                  <AudioRecorder
                    onRecorded={(blob, durationSec) => gradePart1(idx, blob, durationSec)}
                    disabled={part1Loading[idx]}
                  />
                  {part1Loading[idx] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {part1Results[idx] && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <ScoreBadge score={part1Results[idx]!.score} />
                    </div>
                  )}
                </div>
                {part1Results[idx] && (
                  <div className="text-sm text-muted-foreground bg-muted rounded p-2">
                    {part1Results[idx]!.overallFeedback}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Part 2 */}
        <TabsContent value="part2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Đọc đoạn văn sau</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="font-chinese text-lg leading-loose">{passage.text}</div>
                {showPinyin && (
                  <div className="font-pinyin text-sm text-muted-foreground mt-2">{passage.pinyin}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <AudioRecorder
                  onRecorded={(blob, durationSec) => gradePart2(blob, durationSec)}
                  disabled={part2Loading}
                />
                {part2Loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {part2Result && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <ScoreBadge score={part2Result.score} />
                  </div>
                )}
              </div>
              {part2Result && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Phát âm", score: part2Result.criteria.pronunciation.score },
                    { label: "Thanh điệu", score: part2Result.criteria.tones.score },
                    { label: "Lưu loát", score: part2Result.criteria.fluency.score },
                  ].map(({ label, score }) => (
                    <div key={label} className="text-center border rounded-lg p-3">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-xl font-bold">{score}</div>
                      <Progress value={score} className="h-1 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Part 3 */}
        <TabsContent value="part3" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Nghe câu hỏi, suy nghĩ 10 giây, rồi trả lời tự do.
          </p>
          {questions.map((q, idx) => (
            <Card key={idx}>
              <CardContent className="p-4 space-y-3">
                <div className="font-chinese text-lg font-semibold">{q.question}</div>
                {showPinyin && <div className="font-pinyin text-muted-foreground text-sm">{q.pinyin}</div>}
                <div className="flex items-center gap-3">
                  <AudioRecorder
                    onRecorded={(blob, durationSec) => gradePart3(idx, blob, durationSec)}
                    disabled={part3Loading[idx]}
                  />
                  {part3Loading[idx] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {part3Results[idx] && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <ScoreBadge score={part3Results[idx]!.score} />
                    </div>
                  )}
                </div>
                {part3Results[idx] && (
                  <div className="text-sm text-muted-foreground bg-muted rounded p-2">
                    <strong>Transcript:</strong> {part3Results[idx]!.transcript}
                    <br />
                    {part3Results[idx]!.overallFeedback}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {onFinish && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border bg-muted/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Luyện đủ 3 phần rồi bấm hoàn thành để ghi nhận phần Nói cho bài lộ trình.
          </p>
          <Button onClick={handleFinish} disabled={finishing || finished} className="gap-1.5">
            {finishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {finished ? "Đã hoàn thành" : "Hoàn thành phần Nói"}
          </Button>
        </div>
      )}
    </div>
  );
}
