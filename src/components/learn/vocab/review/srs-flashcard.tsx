"use client";
import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTone } from "@/lib/pinyin";
import { toneColor, cn, markWord } from "@/lib/utils";
import { playWord } from "@/lib/speech";
import type { SrsRating } from "@/lib/srs";
import type { VocabWordCard } from "@/types";

interface Props {
  word: VocabWordCard;
  /** Từ mới (chưa từng ôn) → đổi lời nhắc cho phù hợp. */
  isNew?: boolean;
  onRate: (rating: SrsRating) => void;
}

const RATINGS: { rating: SrsRating; label: string; hint: string; cls: string }[] = [
  { rating: "again", label: "Quên", hint: "ôn lại sớm", cls: "border-red-300 text-red-700 hover:bg-red-50" },
  { rating: "hard", label: "Khó", hint: "", cls: "border-orange-300 text-orange-700 hover:bg-orange-50" },
  { rating: "good", label: "Tốt", hint: "", cls: "border-green-300 text-green-700 hover:bg-green-50" },
  { rating: "easy", label: "Dễ", hint: "giãn xa", cls: "border-sky-300 text-sky-700 hover:bg-sky-50" },
];

/**
 * Flashcard có áp dụng lặp lại ngắt quãng: lật xem nghĩa rồi TỰ ĐÁNH GIÁ mức nhớ
 * (Quên/Khó/Tốt/Dễ). Mức này quy đổi thành điểm chất lượng SM-2 để xếp lịch ôn.
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
    setRevealed(true);
    playWord({ hanzi: word.hanzi, audioUrl: word.audioUrl });
  }

  // Chặn bấm 2 lần (tránh chấm/đi tiếp 2 lần, bỏ sót thẻ kế).
  function rate(r: SrsRating) {
    if (rated) return;
    setRated(true);
    onRate(r);
  }

  const example = word.examples[0];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
      <p className="text-sm font-medium text-muted-foreground">
        {isNew ? "Từ mới — ghi nhớ rồi tự đánh giá" : "Bạn còn nhớ nghĩa từ này?"}
      </p>

      <div
        onClick={() => !revealed && reveal()}
        className={cn(
          "flex min-h-[15rem] w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-6 text-center shadow-soft",
          !revealed && "cursor-pointer select-none",
        )}
      >
        <div className={cn("font-chinese text-7xl font-bold", toneColor(getTone(word.pinyin)))}>
          {word.hanzi}
        </div>
        {revealed ? (
          <>
            <div className="font-pinyin text-xl text-muted-foreground">{word.pinyin}</div>
            <div className="text-lg font-medium">{word.meaning}</div>
            {example && (
              <div className="mt-1 border-t pt-2 text-sm text-muted-foreground">
                <span className="font-chinese">
                  {markWord(example.hanzi, word.hanzi).map((seg, i) => (
                    <span key={i} className={seg.match ? "font-bold text-foreground" : ""}>
                      {seg.text}
                    </span>
                  ))}
                </span>
                <span className="ml-1.5">— {example.meaning}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">Chạm để xem nghĩa & nghe</div>
        )}
      </div>

      {revealed ? (
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
      ) : (
        <Button variant="outline" onClick={reveal}>
          <Volume2 className="mr-1.5 h-4 w-4" /> Xem nghĩa &amp; nghe
        </Button>
      )}
    </div>
  );
}
