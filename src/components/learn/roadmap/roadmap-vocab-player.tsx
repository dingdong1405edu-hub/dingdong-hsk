"use client";
import { useMemo, useState } from "react";
import { BookOpen, Sparkles, RotateCcw, Play, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isDue } from "@/lib/srs";
import { WordFlow } from "@/components/learn/vocab/word-flow";
import { ReviewFlow } from "@/components/learn/vocab/review/review-flow";
import { persistRoadmapReview } from "@/lib/roadmap-review-persist";
import type { VocabWordCard, WordReviewState } from "@/types";

interface Props {
  sectionId: string;
  title: string;
  words: VocabWordCard[];
  /** Trạng thái SRS đã lưu (RoadmapWordReview) cho các từ của phần này. */
  reviews: WordReviewState[];
  /** Phần Từ vựng đã hoàn thành (Học từ) → mở thẳng tab Ôn từ. */
  completed: boolean;
  passThreshold: number;
  backHref: string;
  /** Ghi hoàn thành phần Từ vựng cho bài lộ trình (cộng XP, đánh dấu skillsDone). */
  onComplete: (stats: {
    correct: number;
    total: number;
    durationSec: number;
  }) => Promise<{ ok: boolean; xpEarned?: number }>;
}

type View = "menu" | "learn" | "review";

/**
 * Trình chơi phần Từ vựng của một bài LỘ TRÌNH — bản sao cấu trúc của LessonHub ở
 * Luyện kỹ năng: 2 chế độ dạng tab "Học từ" (WordFlow) và "Ôn từ" (flashcard lặp
 * lại ngắt quãng + mini-game). Khác biệt: Học từ ghi hoàn thành phần lộ trình
 * (onComplete), còn Ôn từ ghi lịch SRS vào RoadmapWordReview (theo hanzi).
 */
export function RoadmapVocabPlayer({
  sectionId,
  title,
  words,
  reviews,
  completed,
  passThreshold,
  backHref,
  onComplete,
}: Props) {
  const [view, setView] = useState<View>("menu");

  const dueCount = useMemo(() => {
    const now = new Date();
    const byId = new Map(reviews.map((r) => [r.wordId, r]));
    return words.filter((w) => isDue(byId.get(w.id)?.dueAt ?? null, now)).length;
  }, [words, reviews]);

  if (view === "learn") {
    return (
      <WordFlow
        lesson={{ id: `roadmap:${sectionId}`, title }}
        words={words}
        unitId=""
        disablePositionSave
        passThreshold={passThreshold}
        onExit={() => setView("menu")}
        onReviewNow={() => setView("review")}
        onComplete={onComplete}
      />
    );
  }

  if (view === "review") {
    return (
      <ReviewFlow
        words={words}
        reviews={reviews}
        persist={persistRoadmapReview}
        reportable={false}
        onExit={() => setView("menu")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại bài học
      </Link>

      <h1 className="text-2xl font-bold">{title || "Từ vựng"}</h1>

      <Tabs defaultValue={completed ? "review" : "learn"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="learn">
            <BookOpen className="mr-1.5 h-4 w-4" /> Học từ
          </TabsTrigger>
          <TabsTrigger value="review">
            <Sparkles className="mr-1.5 h-4 w-4" /> Ôn từ
          </TabsTrigger>
        </TabsList>

        {/* HỌC TỪ */}
        <TabsContent value="learn">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Học {words.length} từ</div>
                  <p className="text-sm text-muted-foreground">
                    Xem nghĩa &amp; nghe → tập viết từng nét → ôn nhanh bằng flashcard.
                  </p>
                </div>
              </div>

              {words.length === 0 ? (
                <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Phần này chưa có từ vựng.
                </p>
              ) : (
                <Button className="w-full" onClick={() => setView("learn")}>
                  <Play className="mr-1.5 h-4 w-4" /> {completed ? "Học lại" : "Bắt đầu học"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÔN TỪ */}
        <TabsContent value="review">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Ôn từ bằng flashcard &amp; mini-game</div>
                  <p className="text-sm text-muted-foreground">
                    Lặp lại ngắt quãng (SRS): hệ thống tự xếp lịch ôn theo trí nhớ của bạn.
                  </p>
                </div>
              </div>

              {words.length === 0 ? (
                <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                  Phần này chưa có từ để ôn.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    {dueCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        {dueCount} từ đến hạn ôn
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Không có từ đến hạn — có thể ôn sớm để nhớ lâu hơn.
                      </span>
                    )}
                    <span className="text-muted-foreground">/ {words.length} từ</span>
                  </div>
                  <Button className="w-full" onClick={() => setView("review")}>
                    <Sparkles className="mr-1.5 h-4 w-4" />
                    {dueCount > 0 ? "Bắt đầu ôn" : "Ôn sớm"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
