"use client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { submitListeningAction } from "@/server/actions/listening";
import { Play, Pause, Volume2, Eye, CheckCircle2, XCircle } from "lucide-react";
import type { HSKLevel, QuestionType } from "@prisma/client";

interface Option { text: string; pinyin?: string }
interface Question {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
}
interface Test {
  id: string;
  title: string;
  hskLevel: HSKLevel;
  audioUrl: string;
  transcript?: string | null;
  timeLimit: number;
  questions: Question[];
}

export function ListeningTestClient({ test, userId }: { test: Test; userId: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const maxPlays = test.hskLevel === "HSK1" || test.hskLevel === "HSK2" ? 3 : 2;

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      if (playCount >= maxPlays) {
        toast.error(`Giới hạn ${maxPlays} lần nghe`);
        return;
      }
      audioRef.current.play();
      setPlayCount((c) => c + 1);
    }
    setPlaying(!playing);
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }

  async function handleSubmit() {
    const res = await submitListeningAction({ testId: test.id, answers });
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
    } else {
      toast.error("Lỗi nộp bài");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{test.title}</h1>
        <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
      </div>

      {/* Audio Player */}
      <Card>
        <CardContent className="p-4">
          <audio
            ref={audioRef}
            src={test.audioUrl}
            onEnded={() => setPlaying(false)}
          />
          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="outline"
              onClick={togglePlay}
              disabled={playCount >= maxPlays && !playing}
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {playCount}/{maxPlays} lần nghe
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[0.75, 1, 1.25, 1.5].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={speed === s ? "default" : "outline"}
                  className="h-7 px-2 text-xs"
                  onClick={() => changeSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {test.questions.map((q, idx) => {
          const userAnswer = answers[q.id];
          const isCorrect = submitted && result?.details[q.id];
          const correctAns = q.correctAnswer as { index?: number };

          return (
            <Card key={q.id} className={submitted ? (isCorrect ? "border-green-300" : "border-red-300") : ""}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  {submitted && (isCorrect
                    ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    : <XCircle className="h-5 w-5 text-red-500 shrink-0" />)}
                  <span className="font-semibold text-sm font-chinese">
                    {idx + 1}. {q.prompt}
                  </span>
                </div>
                {q.type === "MCQ" && (q.options as Option[])?.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    disabled={submitted}
                    className={`w-full text-left p-2 rounded border text-sm font-chinese transition-colors ${
                      userAnswer === oi
                        ? submitted
                          ? oi === correctAns.index ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50"
                          : "border-primary bg-primary/10"
                        : submitted && oi === correctAns.index
                          ? "border-green-300 bg-green-50/50"
                          : "hover:border-primary/50"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt.text}
                  </button>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!submitted ? (
        <Button className="w-full" onClick={handleSubmit}>Nộp bài</Button>
      ) : (
        <div className="space-y-3">
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="text-4xl font-bold text-primary">{Math.round(result?.score ?? 0)}%</div>
            </CardContent>
          </Card>
          {test.transcript && (
            <Button variant="outline" className="w-full" onClick={() => setShowTranscript(!showTranscript)}>
              <Eye className="h-4 w-4 mr-2" />
              {showTranscript ? "Ẩn" : "Xem"} transcript
            </Button>
          )}
          {showTranscript && test.transcript && (
            <Card>
              <CardContent className="pt-4">
                <pre className="font-chinese text-sm whitespace-pre-wrap">{test.transcript}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
