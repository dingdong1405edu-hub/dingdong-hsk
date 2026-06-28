"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, XCircle, ArrowRight, RotateCcw, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { cn } from "@/lib/utils";
import type { PinyinLesson } from "@/lib/pinyin-lessons";
import { completePinyinLessonAction } from "@/server/actions/pinyin";
import { emitBao } from "@/lib/bao-bus";
import { TeachCardView, ListenCardView, DiscriminateCardView, ToneCardView } from "./pinyin-cards";

type Feedback = "correct" | "wrong" | null;

export function PinyinFlow({ lesson }: { lesson: PinyinLesson }) {
  const { cards } = lesson;
  const total = useMemo(() => cards.filter((c) => c.kind !== "teach").length, [cards]);

  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ correct: number; score: number; xp: number } | null>(null);
  const correctRef = useRef(0);

  const card = cards[index];
  const answered = feedback !== null;
  const progress = done ? 100 : Math.round((index / cards.length) * 100);

  function handleAnswer(isCorrect: boolean) {
    if (feedback !== null) return;
    if (isCorrect) correctRef.current += 1;
    setFeedback(isCorrect ? "correct" : "wrong");
    emitBao(isCorrect ? "correct" : "wrong");
  }

  async function finish() {
    setDone(true);
    setSaving(true);
    const correct = correctRef.current;
    const score = total > 0 ? Math.round((correct / total) * 100) : 100;
    const res = await completePinyinLessonAction({ lessonId: lesson.id, correct, total });
    setSaving(false);
    const xp = res.ok ? res.xpEarned ?? 0 : 0;
    setResult({ correct, score, xp });
    emitBao(score >= 60 ? "celebrate" : "complete");
    if (xp > 0) toast.success(`+${xp} XP — ${lesson.title}`);
  }

  function advance() {
    setFeedback(null);
    if (index + 1 >= cards.length) void finish();
    else setIndex((i) => i + 1);
  }

  function restart() {
    correctRef.current = 0;
    setIndex(0);
    setFeedback(null);
    setDone(false);
    setResult(null);
  }

  // ── Màn kết quả ───────────────────────────────────────────────────────────
  if (done) {
    const passed = (result?.score ?? 0) >= 60;
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <BaoBuddy size={120} pose={passed ? "cheer" : "idle"} message={passed ? "太棒了!" : "加油!"} />
        <h2 className="mt-4 text-2xl font-extrabold">{passed ? "Hoàn thành!" : "Cố lên nhé!"}</h2>
        <div className="font-pinyin mt-2 text-5xl font-bold text-amber-600 dark:text-amber-400">
          {saving ? "…" : `${result?.score ?? 0}%`}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {result?.correct ?? 0}/{total} câu đúng
          {result && result.xp > 0 && <span className="ml-2 font-semibold text-amber-600">+{result.xp} XP</span>}
        </p>
        <div className="mt-7 flex w-full flex-col gap-2.5">
          <Button onClick={restart} variant="outline" className="h-12 gap-2 rounded-xl">
            <RotateCcw className="h-4 w-4" /> Học lại
          </Button>
          <Link href="/hanzi/pinyin" className="w-full">
            <Button className="h-12 w-full gap-2 rounded-xl bg-amber-500 hover:bg-amber-600">
              <List className="h-4 w-4" /> Về danh sách bài học
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Màn học ───────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-[78vh] max-w-2xl flex-col">
      {/* Header: tiến độ + thoát */}
      <div className="flex items-center gap-3 py-2">
        <Link
          href="/hanzi/pinyin"
          aria-label="Thoát"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </Link>
        <Progress value={progress} className="h-2.5" />
        <span className="shrink-0 text-xs font-medium text-muted-foreground">
          {Math.min(index + 1, cards.length)}/{cards.length}
        </span>
      </div>
      <p className="mb-1 mt-1 text-center text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
        {lesson.title}
      </p>

      {/* Thẻ */}
      <div className="flex flex-1 items-center justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            {card.kind === "teach" && <TeachCardView card={card} />}
            {card.kind === "listen" && <ListenCardView card={card} onAnswer={handleAnswer} />}
            {card.kind === "discriminate" && <DiscriminateCardView card={card} onAnswer={handleAnswer} />}
            {card.kind === "tone" && <ToneCardView card={card} onAnswer={handleAnswer} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: tiếp tục / phản hồi */}
      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:px-6">
        {card.kind === "teach" ? (
          <Button onClick={advance} className="h-12 w-full gap-2 rounded-xl bg-amber-500 text-base hover:bg-amber-600">
            Tiếp tục <ArrowRight className="h-4 w-4" />
          </Button>
        ) : answered ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                feedback === "correct" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              )}
            >
              {feedback === "correct" ? (
                <>
                  <CheckCircle2 className="h-5 w-5" /> Chính xác!
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" /> Chưa đúng — xem lại nhé
                </>
              )}
            </div>
            <Button
              onClick={advance}
              className={cn(
                "h-12 gap-2 rounded-xl text-base sm:w-44",
                feedback === "correct" ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600",
              )}
            >
              Tiếp tục <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="py-3 text-center text-sm text-muted-foreground">Nghe rồi chọn đáp án ở trên</p>
        )}
      </div>
    </div>
  );
}
