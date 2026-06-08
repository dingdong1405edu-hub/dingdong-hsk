"use client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hskLevelLabel } from "@/lib/utils";
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

function AudioRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunks.current = [];
      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        onRecorded(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      mediaRecorder.current = mr;
      setRecording(true);
    } catch {
      toast.error("Không thể truy cập microphone");
    }
  }

  function stop() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  return (
    <Button
      onClick={recording ? stop : start}
      disabled={disabled}
      variant={recording ? "destructive" : "default"}
      size="sm"
    >
      {recording ? (
        <><Square className="h-4 w-4 mr-2" /> Dừng</>
      ) : (
        <><Mic className="h-4 w-4 mr-2" /> Ghi âm</>
      )}
    </Button>
  );
}

async function transcribeAndGrade(
  blob: Blob,
  referenceText: string | null,
  part: "repeat" | "read" | "answer",
  question: string | null,
  hskLevel: string
): Promise<GradeResult> {
  const fd = new FormData();
  fd.append("audio", blob, "recording.webm");
  const transcribeRes = await fetch("/zh/api/transcribe", { method: "POST", body: fd });
  const { transcript } = await transcribeRes.json() as { transcript: string };

  const gradeRes = await fetch("/zh/api/grade/speaking", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, referenceText, part, question, hskLevel }),
  });
  return gradeRes.json() as Promise<GradeResult>;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-700" : score >= 60 ? "text-yellow-700" : "text-red-600";
  return <span className={`font-bold text-2xl ${color}`}>{score}</span>;
}

export function SpeakingClient({ set }: { set: SpeakingSetData; userId: string }) {
  const sentences = set.part1Sentences as Sentence[];
  const passage = set.part2Passage as Passage;
  const questions = set.part3Questions as QuestionItem[];

  const [part1Results, setPart1Results] = useState<(GradeResult | null)[]>(Array(sentences.length).fill(null));
  const [part1Loading, setPart1Loading] = useState<boolean[]>(Array(sentences.length).fill(false));
  const [part2Result, setPart2Result] = useState<GradeResult | null>(null);
  const [part2Loading, setPart2Loading] = useState(false);
  const [part3Results, setPart3Results] = useState<(GradeResult | null)[]>(Array(questions.length).fill(null));
  const [part3Loading, setPart3Loading] = useState<boolean[]>(Array(questions.length).fill(false));
  const [showPinyin, setShowPinyin] = useState(false);

  async function gradePart1(idx: number, blob: Blob) {
    setPart1Loading((l) => { const n = [...l]; n[idx] = true; return n; });
    try {
      const res = await transcribeAndGrade(blob, sentences[idx].text, "repeat", null, set.hskLevel);
      setPart1Results((r) => { const n = [...r]; n[idx] = res; return n; });
    } catch {
      toast.error("Lỗi chấm điểm");
    } finally {
      setPart1Loading((l) => { const n = [...l]; n[idx] = false; return n; });
    }
  }

  async function gradePart2(blob: Blob) {
    setPart2Loading(true);
    try {
      const res = await transcribeAndGrade(blob, passage.text, "read", null, set.hskLevel);
      setPart2Result(res);
    } catch {
      toast.error("Lỗi chấm điểm");
    } finally {
      setPart2Loading(false);
    }
  }

  async function gradePart3(idx: number, blob: Blob) {
    setPart3Loading((l) => { const n = [...l]; n[idx] = true; return n; });
    try {
      const res = await transcribeAndGrade(blob, null, "answer", questions[idx].question, set.hskLevel);
      setPart3Results((r) => { const n = [...r]; n[idx] = res; return n; });
    } catch {
      toast.error("Lỗi chấm điểm");
    } finally {
      setPart3Loading((l) => { const n = [...l]; n[idx] = false; return n; });
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Luyện nói HSKK</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{hskLevelLabel(set.hskLevel)}</Badge>
          <Button size="sm" variant="outline" onClick={() => setShowPinyin(!showPinyin)}>
            {showPinyin ? "Ẩn" : "Hiện"} pinyin
          </Button>
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
                    onRecorded={(blob) => gradePart1(idx, blob)}
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
                <AudioRecorder onRecorded={gradePart2} disabled={part2Loading} />
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
                    onRecorded={(blob) => gradePart3(idx, blob)}
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
    </div>
  );
}
