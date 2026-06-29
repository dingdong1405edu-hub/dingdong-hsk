"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PenLine, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { emitBao } from "@/lib/bao-bus";
import { FlashcardPhase, type FlashResult } from "@/components/learn/grammar/flashcard-phase";
import { PassStatus } from "./pass-status";
import type { WritingReorderSentence } from "@/lib/roadmap-content";
import type { Exercise } from "@/types";

interface Props {
  title: string;
  sentences: WritingReorderSentence[];
  backHref: string;
  passThreshold: number;
  /** Ghi hoàn thành phần Viết cho bài lộ trình (đánh dấu skillsDone, cộng XP). */
  onComplete: (stats: { correct: number; total: number; durationSec: number }) => Promise<{ ok: boolean }>;
}

type Stage = "intro" | "practice" | "done";

// Bỏ dấu câu để khớp đúng cách bài tập sentence_order chấm (chosen.join("") === answer).
const PUNCT = /[。，、．！？；：“”‘’（）【】「」《》〈〉()[\]{}.,!?;:"'`~·…—\s]/g;
const stripPunct = (s: string) => s.normalize("NFC").replace(PUNCT, "");

/**
 * Trình chơi phần VIẾT kiểu "连词成句" (sắp xếp từ thành câu — format thi viết HSK2).
 * Mỗi câu là một bài tập sentence_order (kéo thẻ từ → tạo câu đúng), chấm tự động
 * KHÔNG dùng AI. Tái dùng FlashcardPhase của Ngữ pháp để có sẵn kéo-thả + giải thích.
 */
export function RoadmapWritingPlayer({ title, sentences, backHref, passThreshold, onComplete }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [resultPct, setResultPct] = useState<number | null>(null);
  const savedRef = useRef(false);

  const exercises = useMemo<Exercise[]>(
    () =>
      sentences.map((s) => ({
        type: "sentence_order",
        words: s.words,
        answer: stripPunct(s.answer),
        meaning: s.translation,
        explanation: s.explanation,
      })),
    [sentences]
  );

  async function finish(result: FlashResult) {
    if (savedRef.current) return;
    savedRef.current = true;
    const graded = result.correct + result.wrong;
    const total = Math.max(1, graded);
    const pct = graded > 0 ? Math.round((result.correct / total) * 100) : null;
    setResultPct(pct);
    emitBao(pct != null && pct >= 80 ? "celebrate" : "complete");
    const durationSec = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
    const res = await onComplete({ correct: result.correct, total, durationSec });
    if (!res.ok) toast.error("Lỗi lưu kết quả");
    setStage("done");
  }

  if (stage === "practice") {
    return (
      <FlashcardPhase
        flashcards={exercises}
        closeHref={backHref}
        label="Luyện viết"
        onDone={finish}
      />
    );
  }

  if (stage === "done") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <BaoBuddy size={104} pose="cheer" message="写得好!" className="mx-auto" />
            <h2 className="text-2xl font-bold">Hoàn thành phần Viết!</h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã luyện sắp xếp câu cho bài “{title || "Luyện viết"}”.
            </p>

            {resultPct != null && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-3xl font-extrabold text-primary">Kết quả: {resultPct}%</div>
                <PassStatus score={resultPct} threshold={passThreshold} />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  savedRef.current = false;
                  setResultPct(null);
                  setStartTime(Date.now());
                  setStage("practice");
                }}
              >
                Làm lại
              </Button>
              <Button className="flex-1" onClick={() => router.push(backHref)}>
                Quay lại bài học
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // intro
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">{title || "Luyện viết"}</h1>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Sắp xếp câu · 连词成句 ({sentences.length} câu)</div>
              <p className="text-sm text-muted-foreground">
                Dạng đề VIẾT HSK2: kéo các thẻ từ cho sẵn thành câu đúng. Có bản dịch gợi ý &amp; giải thích.
              </p>
            </div>
          </div>

          {sentences.length === 0 ? (
            <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Phần này chưa có câu luyện viết.
            </p>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                setStartTime(Date.now());
                setStage("practice");
              }}
            >
              <Play className="mr-1.5 h-4 w-4" /> Bắt đầu luyện viết
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
