"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Volume2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTone } from "@/lib/pinyin";
import { toneColor } from "@/lib/utils";
import { playWord } from "@/lib/speech";
import type { VocabWordCard } from "@/types";

interface Props {
  words: VocabWordCard[];
  onDone: () => void;
}

/**
 * Step 5: review the lesson's words as flashcards. Tap a card to flip between
 * Hán tự and pinyin + meaning; the front side is switchable in both directions.
 */
export function FlashcardDeck({ words, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hanziFront, setHanziFront] = useState(true);

  const word = words[index];
  const isLast = index === words.length - 1;

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.min(words.length - 1, Math.max(0, i + delta)));
  }

  const hanziFace = (
    <div className="flex flex-col items-center gap-2">
      <div className={`font-chinese text-7xl font-bold ${toneColor(getTone(word.pinyin))}`}>
        {word.hanzi}
      </div>
    </div>
  );
  const meaningFace = (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="font-pinyin text-2xl text-muted-foreground">{word.pinyin}</div>
      <div className="text-xl font-medium">{word.meaning}</div>
    </div>
  );
  const front = hanziFront ? hanziFace : meaningFace;
  const back = hanziFront ? meaningFace : hanziFace;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Thẻ {index + 1}/{words.length}
        </span>
        <button
          type="button"
          onClick={() => {
            setHanziFront((v) => !v);
            setFlipped(false);
          }}
          className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors hover:bg-muted"
        >
          <RefreshCw className="h-3 w-3" />
          {hanziFront ? "Hán → Nghĩa" : "Nghĩa → Hán"}
        </button>
      </div>

      <div
        className="relative h-56 w-full max-w-sm cursor-pointer select-none"
        style={{ perspective: 1000 }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-card shadow-soft"
            style={{ backfaceVisibility: "hidden" }}
          >
            {front}
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-2xl border bg-card shadow-soft"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {back}
          </div>
        </motion.div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            playWord({ hanzi: word.hanzi, audioUrl: word.audioUrl });
          }}
        >
          <Volume2 className="mr-1.5 h-4 w-4" /> Nghe
        </Button>
        {isLast ? (
          <Button onClick={onDone}>Hoàn thành</Button>
        ) : (
          <Button variant="outline" size="icon" onClick={() => go(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Chạm vào thẻ để lật</p>
    </div>
  );
}
