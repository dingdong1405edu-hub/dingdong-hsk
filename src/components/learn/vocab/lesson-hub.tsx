"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles, RotateCcw, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { isDue } from "@/lib/srs";
import { WordFlow } from "./word-flow";
import { ReviewFlow } from "./review/review-flow";
import type { VocabWordCard, WordReviewState } from "@/types";

interface Props {
  lesson: { id: string; title: string };
  unitId: string;
  words: VocabWordCard[];
  reviews: WordReviewState[];
  /** Vị trí học dở (cho "Học tiếp"). null = chưa có / đã hoàn thành. */
  resume: { wordIndex: number; step: number } | null;
  completed: boolean;
  nextLessonId: string | null;
}

type View = "menu" | "learn" | "review";

/**
 * Trang vào một bài từ vựng: 2 chế độ dưới dạng tab — "Học từ" (luồng học theo
 * từng từ, có Học tiếp/Học lại) và "Ôn từ" (flashcard SRS + mini-game). Chọn chế
 * độ → mở luồng tương ứng toàn màn hình, thoát thì quay lại menu này.
 */
export function LessonHub({ lesson, unitId, words, reviews, resume, completed, nextLessonId }: Props) {
  const [view, setView] = useState<View>("menu");
  const [learnStart, setLearnStart] = useState<{ index: number; step: number }>({ index: 0, step: 0 });

  const { dueCount } = useMemo(() => {
    const now = new Date();
    const byId = new Map(reviews.map((r) => [r.wordId, r]));
    const due = words.filter((w) => isDue(byId.get(w.id)?.dueAt ?? null, now)).length;
    return { dueCount: due };
  }, [words, reviews]);

  if (view === "learn") {
    return (
      <WordFlow
        lesson={lesson}
        words={words}
        unitId={unitId}
        startIndex={learnStart.index}
        startStep={learnStart.step}
        nextLessonId={nextLessonId}
        onExit={() => setView("menu")}
        onReviewNow={() => setView("review")}
      />
    );
  }

  if (view === "review") {
    return <ReviewFlow words={words} reviews={reviews} onExit={() => setView("menu")} />;
  }

  const startLearn = (index: number, step: number) => {
    setLearnStart({ index, step });
    setView("learn");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={`/vocab/${unitId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{lesson.title || "Từ vựng"}</h1>
        {completed && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Đã học
          </span>
        )}
      </div>

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
                  Bài này chưa có từ vựng.
                </p>
              ) : resume ? (
                <div className="space-y-3">
                  <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                    Bạn đang học dở ở <b>từ {Math.min(resume.wordIndex + 1, words.length)}</b>.
                  </p>
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => startLearn(resume.wordIndex, resume.step)}>
                      <Play className="mr-1.5 h-4 w-4" /> Học tiếp
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => startLearn(0, 0)}>
                      <RotateCcw className="mr-1.5 h-4 w-4" /> Học lại
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => startLearn(0, 0)}>
                    <Play className="mr-1.5 h-4 w-4" /> {completed ? "Học lại" : "Bắt đầu học"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ÔN TỪ */}
        <TabsContent value="review">
          <Card>
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
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
                  Bài này chưa có từ để ôn.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    {dueCount > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 font-medium text-amber-700">
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
