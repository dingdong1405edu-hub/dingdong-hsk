"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FlashcardPhase, type FlashResult } from "./flashcard-phase";
import type { Exercise } from "@/types";

/** One row in the progress breakdown shown on the review summary. */
export interface ReviewProgressItem {
  label: string;
  /** Completion %, 0–100. */
  pct: number;
}

interface Props {
  /** Display title of the scope being reviewed (unit or HSK level). */
  title: string;
  /** All practice items gathered from the scope's lessons. */
  exercises: Exercise[];
  /** Where the close button / "Xong" returns to. */
  closeHref: string;
  /** Aggregate completion of the whole scope. */
  overall: { label: string; pct: number };
  /** Heading for the per-item breakdown (e.g. "Tiến độ từng bài"). */
  itemsTitle: string;
  /** Per-lesson (unit review) or per-unit (level review) completion. */
  items: ReviewProgressItem[];
}

type Stage = "review" | "done";

/**
 * "Ôn ngữ pháp" runner. Mixes all practice items of a unit (or a whole HSK
 * level) into one shuffled, risk-free flashcard session, then shows the review
 * accuracy alongside how much of the lesson(s) and the unit/level the learner
 * has already completed. Reuses FlashcardPhase, so the click-to-lookup context
 * words and the wrong-answer explanations work here too.
 */
export function GrammarReview({ title, exercises, closeHref, overall, itemsTitle, items }: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("review");
  const [result, setResult] = useState<FlashResult | null>(null);
  // Shuffle only AFTER mount: server and the first client render must produce the
  // same DOM (a stable placeholder), or deck[0] would differ and React would
  // throw a hydration mismatch. The randomised order is applied client-side.
  const [deck, setDeck] = useState<Exercise[] | null>(null);
  useEffect(() => {
    setDeck([...exercises].sort(() => Math.random() - 0.5));
  }, [exercises]);

  if (exercises.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">📭</div>
        <h2 className="text-xl font-bold">Chưa có bài tập để ôn</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Phần này chưa có flashcard hay bài tập nào. Hãy quay lại sau nhé!
        </p>
        <Link href={closeHref}>
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>
    );
  }

  if (stage === "review") {
    // `deck` is null until the post-mount shuffle runs — render a stable skeleton
    // so the server HTML and the first client render match (no hydration jump).
    if (!deck) {
      return (
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
          <div className="h-48 w-full animate-pulse rounded-2xl bg-muted/50" />
        </div>
      );
    }
    return (
      <FlashcardPhase
        flashcards={deck}
        closeHref={closeHref}
        label={`Ôn tập · ${title}`}
        onDone={(r) => {
          setResult(r);
          setStage("done");
        }}
      />
    );
  }

  const answered = (result?.correct ?? 0) + (result?.wrong ?? 0);
  const accuracy = answered > 0 ? Math.round(((result?.correct ?? 0) / answered) * 100) : null;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center py-6">
      <Card className="w-full text-center">
        <CardContent className="space-y-5 px-6 pb-6 pt-8">
          <div className="text-6xl">🎉</div>
          <h2 className="text-2xl font-bold">Đã ôn xong!</h2>
          <p className="text-sm text-muted-foreground">{title}</p>

          {accuracy !== null && (
            <div>
              <div className="text-4xl font-bold text-violet-600">{accuracy}%</div>
              <div className="text-sm text-muted-foreground">
                Độ chính xác · {result?.correct ?? 0}/{answered} câu đúng
                {result?.skipped ? ` · ${result.skipped} bỏ qua` : ""}
              </div>
            </div>
          )}

          {/* Overall completion of the unit / level */}
          <div className="space-y-1.5 rounded-xl border bg-muted/30 p-4 text-left">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>{overall.label}</span>
              <span className="text-violet-600">{overall.pct}%</span>
            </div>
            <Progress value={overall.pct} className="h-2" />
          </div>

          {/* Per-lesson / per-unit breakdown */}
          {items.length > 0 && (
            <div className="space-y-2 text-left">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {itemsTitle}
              </div>
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {it.pct >= 100 ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{it.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              Ôn lại
            </Button>
            <Button className="flex-1" onClick={() => router.push(closeHref)}>
              Xong
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
