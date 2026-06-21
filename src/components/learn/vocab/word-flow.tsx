"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { completeLessonAction } from "@/server/actions/lesson";
import { WordCard } from "./word-card";
import { StrokeQuiz } from "./stroke-quiz";
import { FlashcardDeck } from "./flashcard-deck";
import type { VocabWordCard } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  words: VocabWordCard[];
  unitId: string;
}

type Phase = "learn" | "flashcards" | "done";
const STEP_LABELS = ["Học từ", "Viết theo nét", "Tự viết"] as const;

export function WordFlow({ lesson, words, unitId }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("learn");
  const [wordIndex, setWordIndex] = useState(0);
  const [step, setStep] = useState(0); // 0 card · 1 trace · 2 recall
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  const word = words[wordIndex];
  const totalSteps = words.length * STEP_LABELS.length;
  const progress = useMemo(() => {
    if (phase !== "learn") return 100;
    return Math.round(((wordIndex * STEP_LABELS.length + step) / totalSteps) * 100);
  }, [phase, wordIndex, step, totalSteps]);

  // Empty lesson — nothing authored yet.
  if (words.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">📭</div>
        <h2 className="text-xl font-bold">Bài học chưa có từ vựng</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nội dung bài này đang được biên soạn. Hãy quay lại sau nhé!
        </p>
        <Link href={`/vocab/${unitId}`}>
          <Button variant="outline">Quay lại</Button>
        </Link>
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
    const res = await completeLessonAction({
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

  if (phase === "done") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Hoàn thành bài học!</h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã học {words.length} từ trong bài “{lesson.title || "Từ vựng"}”.
            </p>
            {xpEarned !== null && xpEarned > 0 && (
              <div className="font-semibold text-yellow-600">+{xpEarned} XP</div>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                Học lại
              </Button>
              <Button className="flex-1" onClick={() => router.push(`/vocab/${unitId}`)}>
                Tiếp tục
              </Button>
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
        <Link href={`/vocab/${unitId}`} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </Link>
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
