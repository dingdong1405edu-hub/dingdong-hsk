"use client";
import { useEffect, useRef, useState } from "react";
import { Check, X, Volume2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { playWord } from "@/lib/speech";
import type { VocabWordCard } from "@/types";

export type OptionKind = "hanzi" | "pinyin" | "text";

export interface McqCardProps {
  /** Dòng hướng dẫn (vd "Từ này nghĩa là gì?"). */
  question: string;
  /** Vùng đề bài (chữ Hán to / nghĩa / nút nghe) — do caller dựng. */
  promptNode: React.ReactNode;
  options: string[];
  optionKind: OptionKind;
  correctIndex: number;
  /** Nếu có: hiện nút "Nghe"; dùng cho dạng nghe-chọn / chọn thanh điệu. */
  audioWord?: VocabWordCard | null;
  /** Tự phát audio khi vào (mặc định false; bài "nghe" bật true). */
  autoPlay?: boolean;
  onAnswered: (correct: boolean) => void;
}

/**
 * Thẻ trắc nghiệm dùng chung cho các mini-game ôn từ (chọn nghĩa / chọn chữ Hán /
 * chọn pinyin / chọn thanh điệu / nghe-chọn). Một lượt đoán → hiện phản hồi
 * (đúng xanh, sai đỏ + tô đáp án đúng) → "Tiếp tục".
 */
export function McqCard({
  question,
  promptNode,
  options,
  optionKind,
  correctIndex,
  audioWord,
  autoPlay,
  onAnswered,
}: McqCardProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === correctIndex;

  const played = useRef(false);
  useEffect(() => {
    if (autoPlay && audioWord && !played.current) {
      played.current = true;
      playWord({ hanzi: audioWord.hanzi, audioUrl: audioWord.audioUrl });
    }
  }, [autoPlay, audioWord]);

  const optionClass =
    optionKind === "hanzi"
      ? "font-chinese text-2xl"
      : optionKind === "pinyin"
        ? "font-pinyin text-lg"
        : "text-base";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-4">
        <p className="text-sm font-medium text-muted-foreground">{question}</p>
        <div className="flex flex-col items-center gap-3">
          {promptNode}
          {audioWord && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => playWord({ hanzi: audioWord.hanzi, audioUrl: audioWord.audioUrl })}
            >
              <Volume2 className="mr-1.5 h-4 w-4" /> Nghe lại
            </Button>
          )}
        </div>
        <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
          {options.map((opt, i) => {
            const isCorrect = i === correctIndex;
            const isPicked = i === picked;
            const state = !answered ? "idle" : isCorrect ? "correct" : isPicked ? "wrong" : "idle";
            return (
              <button
                key={i}
                type="button"
                disabled={answered}
                onClick={() => !answered && setPicked(i)}
                className={cn(
                  "flex min-h-[3.25rem] items-center justify-center rounded-xl border-2 px-4 py-3 text-center transition-colors",
                  optionClass,
                  state === "idle" && "border-border hover:border-primary/60 hover:bg-muted/40",
                  state === "correct" && "border-green-500 bg-green-50 text-green-700",
                  state === "wrong" && "border-red-500 bg-red-50 text-red-700",
                  answered && state === "idle" && "opacity-50",
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "border-t py-4 transition-colors",
          answered && (correct ? "bg-green-50" : "bg-red-50"),
        )}
      >
        {answered ? (
          <div className="flex items-center justify-between gap-3">
            <div
              className={cn(
                "flex items-center gap-2 font-semibold",
                correct ? "text-green-700" : "text-red-700",
              )}
            >
              {correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              {correct ? "Chính xác!" : "Chưa đúng — xem đáp án đúng"}
            </div>
            <Button onClick={() => onAnswered(correct)}>
              Tiếp tục <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">Chọn một đáp án</p>
        )}
      </div>
    </div>
  );
}
