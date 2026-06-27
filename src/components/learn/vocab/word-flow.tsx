"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { completeLessonAction } from "@/server/actions/lesson";
import { saveVocabPositionAction } from "@/server/actions/vocab-review";
import { WordCard } from "./word-card";
import { StrokeQuiz } from "./stroke-quiz";
import { FlashcardDeck } from "./flashcard-deck";
import { playWord } from "@/lib/speech";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { PassStatus } from "@/components/learn/roadmap/pass-status";
import type { VocabWordCard } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  words: VocabWordCard[];
  unitId: string;
  /** Vị trí bắt đầu (cho "Học tiếp"). Mặc định 0/0. */
  startIndex?: number;
  startStep?: number;
  /** Bài kế tiếp trong unit (cho nút "Học tiếp" ở màn hoàn thành). */
  nextLessonId?: string | null;
  /** Thoát về menu bài (tab Học từ / Ôn từ). Nếu không có → link về unit. */
  onExit?: () => void;
  /** Chuyển sang chế độ "Ôn từ" ngay sau khi học xong. */
  onReviewNow?: () => void;
  /** Ghi hoàn thành tuỳ biến (lộ trình). Nếu có → dùng thay completeLessonAction. */
  onComplete?: (stats: {
    correct: number;
    total: number;
    durationSec: number;
  }) => Promise<{ ok: boolean; xpEarned?: number }>;
  /** Tắt lưu vị trí học (bản sao trong lộ trình không có VocabProgress thật). */
  disablePositionSave?: boolean;
  /** Lộ trình: ngưỡng "qua môn" → hiện kết quả % + nhãn Đạt/Chưa đạt ở màn hoàn thành. */
  passThreshold?: number;
}

type Phase = "learn" | "flashcards" | "done";
const STEP_LABELS = ["Học từ", "Viết theo nét", "Tự viết"] as const;

export function WordFlow({
  lesson,
  words,
  unitId,
  startIndex = 0,
  startStep = 0,
  nextLessonId,
  onExit,
  onReviewNow,
  onComplete,
  disablePositionSave,
  passThreshold,
}: Props) {
  const router = useRouter();
  const clampIdx = Math.min(Math.max(0, startIndex), Math.max(0, words.length - 1));
  const clampStep = Math.min(Math.max(0, startStep), STEP_LABELS.length - 1);
  const [phase, setPhase] = useState<Phase>("learn");
  const [wordIndex, setWordIndex] = useState(clampIdx);
  const [step, setStep] = useState(clampStep); // 0 card · 1 trace · 2 recall
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [resultPct, setResultPct] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  const word = words[wordIndex];
  const totalSteps = words.length * STEP_LABELS.length;
  const progress = useMemo(() => {
    if (phase !== "learn") return 100;
    return Math.round(((wordIndex * STEP_LABELS.length + step) / totalSteps) * 100);
  }, [phase, wordIndex, step, totalSteps]);

  // Lưu vị trí đang học (nền) để "Học tiếp" đúng chỗ. Chỉ trong pha học và khi đã
  // có tiến triển (>0/0) — tránh tạo bản ghi tiến độ chỉ vì vừa mở bài.
  useEffect(() => {
    if (disablePositionSave || phase !== "learn" || words.length === 0) return;
    if (wordIndex === 0 && step === 0) return;
    void saveVocabPositionAction({ lessonId: lesson.id, wordIndex, step }).catch(() => {});
  }, [phase, wordIndex, step, lesson.id, words.length, disablePositionSave]);

  // Tự đọc từ khi vào bước viết chữ Hán ("Viết theo nét" / "Tự viết") — giống
  // bước "Học từ" đã tự đọc — để người học vừa viết vừa nghe, dễ nhớ hơn.
  // Phụ thuộc theo trường nguyên thuỷ (không phải object `word`) vì lộ trình
  // dựng lại mảng `words` mỗi lần render → tránh phát lại liên tục.
  const wordHanzi = word?.hanzi;
  const wordAudioUrl = word?.audioUrl;
  useEffect(() => {
    if (phase !== "learn" || !wordHanzi) return;
    if (step === 1 || step === 2) {
      playWord({ hanzi: wordHanzi, audioUrl: wordAudioUrl });
    }
  }, [phase, step, wordHanzi, wordAudioUrl]);

  // Empty lesson — nothing authored yet.
  if (words.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BaoBuddy size={96} pose="idle" className="mx-auto" />
        <h2 className="text-xl font-bold">Bài học chưa có từ vựng</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nội dung bài này đang được biên soạn. Hãy quay lại sau nhé!
        </p>
        {onExit ? (
          <Button variant="outline" onClick={onExit}>
            Quay lại
          </Button>
        ) : (
          <Link href={`/vocab/${unitId}`}>
            <Button variant="outline">Quay lại</Button>
          </Link>
        )}
      </div>
    );
  }

  function goNextStep() {
    if (step < STEP_LABELS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // finished the write step of this word
    if (wordIndex < words.length - 1) {
      setWordIndex((i) => i + 1);
      setStep(0);
    } else {
      setPhase("flashcards");
    }
  }

  function goPrevStep() {
    if (step > 0) {
      setStep((s) => s - 1);
    } else if (wordIndex > 0) {
      setWordIndex((i) => i - 1);
      setStep(STEP_LABELS.length - 1);
    }
  }

  async function finishLesson() {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    const total = Math.max(1, words.length);
    // Luồng "Học từ" đi hết là hoàn thành → 100% (không có câu sai để trừ).
    setResultPct(100);
    const res = onComplete
      ? await onComplete({ correct: total, total, durationSec })
      : await completeLessonAction({
          lessonId: lesson.id,
          skill: "vocab",
          correct: total,
          total,
          heartsLost: 0,
          durationSec,
        });
    if (res.ok) {
      setXpEarned(res.xpEarned ?? 0);
    } else {
      toast.error("Lỗi lưu kết quả");
      setXpEarned(0);
    }
    setPhase("done");
  }

  // "Học lại" — làm lại bài từ đầu, không reload trang.
  function restart() {
    setXpEarned(null);
    setWordIndex(0);
    setStep(0);
    setPhase("learn");
  }

  // "Học tiếp" — sang bài kế tiếp (nếu có), nếu không thì về unit/menu.
  function goNextLesson() {
    if (nextLessonId) {
      router.push(`/vocab/${unitId}/lesson/${nextLessonId}`);
    } else if (onExit) {
      onExit();
    } else {
      router.push(`/vocab/${unitId}`);
    }
  }

  if (phase === "done") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <BaoBuddy size={104} pose="cheer" message="做得好!" className="mx-auto" />
            <h2 className="text-2xl font-bold">Hoàn thành bài học!</h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã học {words.length} từ trong bài “{lesson.title || "Từ vựng"}”.
            </p>
            {passThreshold != null && resultPct != null && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="text-3xl font-extrabold text-primary">Kết quả: {resultPct}%</div>
                <PassStatus score={resultPct} threshold={passThreshold} />
              </div>
            )}
            {xpEarned !== null && xpEarned > 0 && (
              <div className="font-semibold text-yellow-600 dark:text-yellow-400">+{xpEarned} XP</div>
            )}
            <div className="grid gap-2 pt-2">
              {onReviewNow && (
                <Button className="w-full" onClick={onReviewNow}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Ôn từ ngay
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={restart}>
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Học lại
                </Button>
                <Button
                  variant={onReviewNow ? "outline" : "default"}
                  className="flex-1"
                  onClick={goNextLesson}
                >
                  {nextLessonId ? "Học tiếp" : "Hoàn tất"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Thoát"
          >
            <X className="h-5 w-5" />
          </button>
        ) : (
          <Link href={`/vocab/${unitId}`} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </Link>
        )}
        <Progress value={progress} className="h-3 flex-1" />
      </div>

      {phase === "flashcards" ? (
        <div className="flex flex-1 flex-col justify-center py-6">
          <h2 className="mb-6 text-center text-lg font-bold">Ôn tập bằng flashcard</h2>
          <FlashcardDeck words={words} onDone={finishLesson} />
        </div>
      ) : (
        <>
          <div className="pb-2 text-center text-sm text-muted-foreground">
            Từ {wordIndex + 1}/{words.length} · {STEP_LABELS[step]}
          </div>
          <div className="flex flex-1 flex-col justify-center py-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${wordIndex}-${step}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && <WordCard word={word} />}
                {step === 1 && (
                  <StrokeQuiz key={`${word.id}-trace`} mode="trace" character={word.hanzi} />
                )}
                {step === 2 && (
                  <StrokeQuiz key={`${word.id}-recall`} mode="recall" character={word.hanzi} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-between gap-2 border-t py-4">
            <Button
              variant="ghost"
              onClick={goPrevStep}
              disabled={wordIndex === 0 && step === 0}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Trước
            </Button>
            <Button onClick={goNextStep}>
              Tiếp tục
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
