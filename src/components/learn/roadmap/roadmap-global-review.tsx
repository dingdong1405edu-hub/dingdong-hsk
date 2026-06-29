"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewFlow } from "@/components/learn/vocab/review/review-flow";
import { persistRoadmapReview } from "@/lib/roadmap-review-persist";
import type { VocabWordCard, WordReviewState } from "@/types";

interface Props {
  words: VocabWordCard[];
  reviews: WordReviewState[];
  /** Nơi quay lại (trang map cấp đã vào, mặc định danh sách lộ trình). */
  backHref: string;
}

/**
 * Hub ôn tập tổng hợp cho LỘ TRÌNH: gom mọi từ vựng lộ trình đã đến hạn ôn (SRS),
 * gom về một phiên. Bản sao của GlobalReview (Luyện kỹ năng) nhưng ghi lịch vào
 * RoadmapWordReview (theo hanzi) và quay về trang lộ trình.
 */
export function RoadmapGlobalReview({ words, reviews, backHref }: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(false);

  if (started && words.length > 0) {
    return (
      <ReviewFlow
        words={words}
        reviews={reviews}
        persist={persistRoadmapReview}
        reportable={false}
        title="Ôn tập lộ trình"
        onExit={() => router.push(backHref)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại lộ trình
      </Link>

      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Ôn tập tổng hợp lộ trình</h1>
          {words.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Có <b>{words.length}</b> từ vựng lộ trình đến hạn ôn. Ôn ngay bằng flashcard
                &amp; mini-game để nhớ lâu hơn.
              </p>
              <Button className="w-full" onClick={() => setStarted(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Bắt đầu ôn {words.length} từ
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Hiện chưa có từ lộ trình nào đến hạn ôn. Hãy học thêm từ ở các bài lộ trình, hệ
                thống sẽ tự xếp lịch ôn cho bạn.
              </p>
              <Link href={backHref}>
                <Button variant="outline" className="w-full">
                  Quay lại lộ trình
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
