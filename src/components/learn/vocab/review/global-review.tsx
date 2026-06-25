"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewFlow } from "./review-flow";
import type { VocabWordCard, WordReviewState } from "@/types";

interface Props {
  words: VocabWordCard[];
  reviews: WordReviewState[];
}

/**
 * Hub ôn tập tổng hợp toàn module: gom mọi từ đã đến hạn ôn (SRS) ở mọi bài. Hiện
 * màn giới thiệu rồi mở ReviewFlow; xong thì quay về /vocab.
 */
export function GlobalReview({ words, reviews }: Props) {
  const router = useRouter();
  const [started, setStarted] = useState(false);

  if (started && words.length > 0) {
    return (
      <ReviewFlow
        words={words}
        reviews={reviews}
        title="Ôn tập tổng hợp"
        onExit={() => router.push("/vocab")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/vocab"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại Từ vựng
      </Link>

      <Card>
        <CardContent className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Ôn tập tổng hợp</h1>
          {words.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Có <b>{words.length}</b> từ đến hạn ôn trên khắp các bài. Ôn ngay bằng flashcard
                &amp; mini-game để nhớ lâu hơn.
              </p>
              <Button className="w-full" onClick={() => setStarted(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Bắt đầu ôn {words.length} từ
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Hiện chưa có từ nào đến hạn ôn. Hãy học thêm từ mới ở các bài, hệ thống sẽ tự xếp
                lịch ôn cho bạn.
              </p>
              <Link href="/vocab">
                <Button variant="outline" className="w-full">
                  Tới danh sách bài
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
