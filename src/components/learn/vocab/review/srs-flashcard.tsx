"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTone } from "@/lib/pinyin";
import { toneColor, cn, markWord } from "@/lib/utils";
import { playWord } from "@/lib/speech";
import { WordReportButton } from "@/components/learn/vocab/word-report-button";
import type { SrsRating } from "@/lib/srs";
import type { VocabWordCard } from "@/types";

interface Props {
  word: VocabWordCard;
  /** Từ mới (chưa từng ôn) → đổi lời nhắc cho phù hợp. */
  isNew?: boolean;
  onRate: (rating: SrsRating) => void;
}

const RATINGS: { rating: SrsRating; label: string; hint: string; cls: string }[] = [
  { rating: "again", label: "Quên", hint: "1 phút", cls: "border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15" },
  { rating: "hard", label: "Khó", hint: "1 ngày", cls: "border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-500/15" },
  { rating: "good", label: "Tốt", hint: "3 ngày", cls: "border-green-300 dark:border-green-500/40 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-500/15" },
  { rating: "easy", label: "Dễ", hint: "5 ngày+", cls: "border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/15" },
];

/**
 * Flashcard có lặp lại ngắt quãng: lật thẻ (hiệu ứng 3D) để xem pinyin + nghĩa +
 * câu ví dụ, rồi TỰ ĐÁNH GIÁ mức nhớ (Quên/Khó/Tốt/Dễ). Mức này quy đổi thành
 * điểm chất lượng để xếp lịch ôn (src/lib/srs.ts).
 */
export function SrsFlashcard({ word, isNew, onRate }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [rated, setRated] = useState(false);

  // Thẻ mới khi đổi từ.
  useEffect(() => {
    setRevealed(false);
    setRated(false);
  }, [word.id]);

  function reveal() {
    if (revealed) return;
    setRevealed(true);
    playWord({ hanzi: word.hanzi, audioUrl: word.audioUrl });
  }

  // Chặn bấm 2 lần (tránh chấm/đi tiếp 2 lần, bỏ sót thẻ kế).
  function rate(r: SrsRating) {
    if (rated) return;
    setRated(true);
    onRate(r);
  }

  const tone = getTone(word.pinyin);
  const example = word.examples[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
      <p className="text-sm font-medium text-muted-foreground">
        {isNew ? "Từ mới — ghi nhớ rồi tự đánh giá" : "Bạn còn nhớ nghĩa từ này?"}
      </p>

      {/* Thẻ lật 3D */}
      <div className="w-full max-w-sm" style={{ perspective: 1200 }}>
        <motion.div
          onClick={reveal}
          animate={{ rotateY: revealed ? 180 : 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className={cn("relative h-[19rem] w-full", !revealed && "cursor-pointer select-none")}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* MẶT TRƯỚC — chữ Hán */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-soft"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className={cn("font-chinese text-7xl font-bold", toneColor(tone))}>{word.hanzi}</div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCw className="h-3.5 w-3.5" /> Chạm để lật thẻ &amp; nghe
            </div>
          </div>

          {/* MẶT SAU — pinyin + nghĩa + ví dụ (luôn hiển thị) */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto rounded-2xl border bg-card p-5 text-center shadow-soft"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className={cn("font-chinese text-5xl font-bold", toneColor(tone))}>{word.hanzi}</div>
            <div className="font-pinyin text-xl text-muted-foreground">{word.pinyin}</div>
            <div className="text-lg font-medium">{word.meaning}</div>
            {example ? (
              <div className="mt-1 w-full border-t pt-2 text-sm">
                <div className="font-chinese text-base">
                  {markWord(example.hanzi, word.hanzi).map((seg, i) => (
                    <span key={i} className={seg.match ? "font-bold text-primary" : "text-foreground"}>
                      {seg.text}
                    </span>
                  ))}
                </div>
                {example.pinyin && <div className="font-pinyin text-xs text-muted-foreground">{example.pinyin}</div>}
                <div className="text-xs text-muted-foreground">— {example.meaning}</div>
              </div>
            ) : (
              <div className="mt-1 border-t pt-2 text-xs italic text-muted-foreground">
                (Chưa có câu ví dụ cho từ này)
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {revealed ? (
        <>
          <div className="grid w-full max-w-sm grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.rating}
                type="button"
                disabled={rated}
                onClick={() => rate(r.rating)}
                className={cn(
                  "flex flex-col items-center rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50",
                  r.cls,
                )}
              >
                {r.label}
                {r.hint && <span className="text-[10px] font-normal opacity-70">{r.hint}</span>}
              </button>
            ))}
          </div>
          <WordReportButton wordId={word.id} hanzi={word.hanzi} />
        </>
      ) : (
        <Button variant="outline" onClick={reveal}>
          <Volume2 className="mr-1.5 h-4 w-4" /> Xem nghĩa &amp; nghe
        </Button>
      )}
    </div>
  );
}
