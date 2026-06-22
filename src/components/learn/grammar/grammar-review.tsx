"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { FlashcardPhase, type FlashResult } from "./flashcard-phase";
import type { Exercise } from "@/types";

interface Props {
  /** Display title of the scope being reviewed (lesson or unit). */
  title: string;
  /** All practice items gathered from the scope, mixed together. */
  exercises: Exercise[];
  /** Where the close button / "Xong" returns to. */
  closeHref: string;
}

type Stage = "review" | "done";

/** Vietnamese labels for the per-type score breakdown. */
const TYPE_LABEL: Record<string, string> = {
  match: "Nối từ",
  translate: "Dịch câu",
  toneSelect: "Chọn thanh điệu",
  sentenceOrder: "Sắp xếp câu",
  sentence_order: "Sắp xếp câu",
  pinyinMatch: "Nối pinyin",
  fill_blank: "Điền chỗ trống",
  answer_question: "Trả lời câu hỏi",
  type_sentence: "Viết câu",
};

function scoreTone(pct: number): string {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

/**
 * "Ôn tập" runner. Mixes all practice items of a lesson (or a whole unit) into
 * one shuffled, no-theory session — quiz + flashcard trộn hết — then shows a
 * detailed percentage score: overall %, đúng/sai/bỏ qua, độ chính xác, and a
 * per-type breakdown. Reuses FlashcardPhase, so the click-to-lookup context
 * words and the wrong-answer explanations work here too.
 */
export function GrammarReview({ title, exercises, closeHref }: Props) {
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
        <BaoBuddy size={88} pose="idle" className="mx-auto" />
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

  // ===== Detailed score =====
  const total = (result?.correct ?? 0) + (result?.wrong ?? 0) + (result?.skipped ?? 0);
  const correct = result?.correct ?? 0;
  const wrong = result?.wrong ?? 0;
  const skipped = result?.skipped ?? 0;
  const answered = correct + wrong;
  // The headline score counts every item: skipped & wrong both cost points.
  const scorePct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const accuracyPct = answered > 0 ? Math.round((correct / answered) * 100) : null;

  // Per-type breakdown from the per-card log.
  const byType = new Map<string, { correct: number; total: number }>();
  for (const d of result?.details ?? []) {
    const e = byType.get(d.type) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (d.outcome === "correct") e.correct += 1;
    byType.set(d.type, e);
  }
  const typeRows = Array.from(byType.entries()).map(([type, v]) => ({
    label: TYPE_LABEL[type] ?? type,
    correct: v.correct,
    total: v.total,
    pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
  }));

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center py-6">
      <Card className="w-full text-center">
        <CardContent className="space-y-5 px-6 pb-6 pt-8">
          <BaoBuddy
            size={96}
            pose={scorePct >= 80 ? "cheer" : "idle"}
            message={scorePct >= 80 ? "棒极了!" : "继续加油"}
            className="mx-auto"
          />
          <h2 className="text-2xl font-bold">Kết quả ôn tập</h2>
          <p className="text-sm text-muted-foreground">{title}</p>

          {/* Headline score */}
          <div>
            <div className={`text-5xl font-extrabold ${scoreTone(scorePct)}`}>{scorePct}%</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {correct}/{total} câu đúng
              {accuracyPct !== null && answered !== total && (
                <> · độ chính xác khi trả lời {accuracyPct}%</>
              )}
            </div>
          </div>

          {/* Đúng / Sai / Bỏ qua */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-green-50 p-3">
              <CheckCircle2 className="mx-auto h-5 w-5 text-green-600" />
              <div className="mt-1 text-lg font-bold text-green-700">{correct}</div>
              <div className="text-[11px] text-muted-foreground">Đúng</div>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <XCircle className="mx-auto h-5 w-5 text-red-500" />
              <div className="mt-1 text-lg font-bold text-red-600">{wrong}</div>
              <div className="text-[11px] text-muted-foreground">Sai</div>
            </div>
            <div className="rounded-xl bg-muted p-3">
              <SkipForward className="mx-auto h-5 w-5 text-muted-foreground" />
              <div className="mt-1 text-lg font-bold text-foreground">{skipped}</div>
              <div className="text-[11px] text-muted-foreground">Bỏ qua</div>
            </div>
          </div>

          {/* Per-type breakdown */}
          {typeRows.length > 0 && (
            <div className="space-y-2 text-left">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Chi tiết theo loại bài
              </div>
              <ul className="space-y-2">
                {typeRows.map((r, i) => (
                  <li key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="min-w-0 truncate">{r.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {r.correct}/{r.total} · {r.pct}%
                      </span>
                    </div>
                    <Progress value={r.pct} className="h-1.5" />
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
