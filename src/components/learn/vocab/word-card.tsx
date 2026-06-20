"use client";
import { useEffect } from "react";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTone } from "@/lib/pinyin";
import { toneColor, markWord } from "@/lib/utils";
import { playWord } from "@/lib/speech";
import type { VocabWordCard } from "@/types";

interface Props {
  word: VocabWordCard;
}

/**
 * Step 1 of the per-word flow: show the word and auto-read it aloud, with
 * pinyin, Vietnamese meaning, and example sentences that bold the target word.
 */
export function WordCard({ word }: Props) {
  // Auto-read on open. Keyed by word.id so it re-fires when the flow advances.
  useEffect(() => {
    playWord({ hanzi: word.hanzi, audioUrl: word.audioUrl });
  }, [word.id, word.hanzi, word.audioUrl]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-2">
        <div className={`font-chinese text-7xl font-bold sm:text-8xl ${toneColor(getTone(word.pinyin))}`}>
          {word.hanzi}
        </div>
        <div className="font-pinyin text-2xl text-muted-foreground">{word.pinyin}</div>
        <div className="text-lg font-medium">{word.meaning}</div>
        <Button
          variant="outline"
          size="sm"
          className="mt-1"
          onClick={() => playWord({ hanzi: word.hanzi, audioUrl: word.audioUrl })}
        >
          <Volume2 className="mr-1.5 h-4 w-4" /> Nghe lại
        </Button>
      </div>

      {word.examples.length > 0 && (
        <div className="w-full max-w-md space-y-3 text-left">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ví dụ
          </div>
          {word.examples.map((ex, i) => (
            <button
              key={i}
              type="button"
              onClick={() => playWord({ hanzi: ex.hanzi })}
              className="block w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
            >
              <div className="font-chinese text-xl">
                {markWord(ex.hanzi, word.hanzi).map((seg, j) =>
                  seg.match ? (
                    <span key={j} className="font-bold text-primary">
                      {seg.text}
                    </span>
                  ) : (
                    <span key={j}>{seg.text}</span>
                  )
                )}
              </div>
              {ex.pinyin && (
                <div className="font-pinyin text-sm text-muted-foreground">{ex.pinyin}</div>
              )}
              {ex.meaning && <div className="mt-0.5 text-sm">{ex.meaning}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
