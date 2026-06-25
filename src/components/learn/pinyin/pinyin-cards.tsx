"use client";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { speakChinese } from "@/lib/speech";
import { toneColor, cn } from "@/lib/utils";
import { TONE_SHORT } from "@/lib/pinyin-data";
import type { TeachCard, ListenCard, DiscriminateCard, ToneCard } from "@/lib/pinyin-lessons";
import { SoundButton } from "./sound-button";

// Tô màu nút lựa chọn theo trạng thái sau khi trả lời.
function optionClass(state: "idle" | "correct" | "wrong" | "dim"): string {
  switch (state) {
    case "correct":
      return "border-green-500 bg-green-50 text-green-700 dark:border-green-400/50 dark:bg-green-500/15 dark:text-green-300";
    case "wrong":
      return "border-red-500 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-500/15 dark:text-red-300";
    case "dim":
      return "border-border bg-card text-muted-foreground opacity-60";
    default:
      return "border-border bg-card hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50/60 dark:hover:bg-amber-500/10";
  }
}

function ReplayRow({ hanzi }: { hanzi: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => speakChinese(hanzi)}
        aria-label="Nghe lại"
        className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-white shadow-soft transition-all hover:bg-amber-600 active:scale-95"
      >
        <RotateCcw className="h-8 w-8" />
      </button>
      <span className="text-xs text-muted-foreground">Nhấn để nghe lại</span>
    </div>
  );
}

// ── Thẻ giới thiệu (teach) ───────────────────────────────────────────────────

export function TeachCardView({ card }: { card: TeachCard }) {
  // Tự phát âm khi thẻ xuất hiện để học viên nghe ngay.
  useEffect(() => {
    speakChinese(card.hanzi);
  }, [card.hanzi]);

  return (
    <div className="flex flex-col items-center text-center">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
        {card.category}
      </span>
      <div className="font-pinyin mt-5 text-7xl font-bold text-amber-600 dark:text-amber-400 sm:text-8xl">
        {card.big}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <span className={cn("font-chinese text-4xl font-bold", toneColor(card.toneColor))}>{card.hanzi}</span>
        <div className="text-left">
          <div className={cn("font-pinyin text-lg font-semibold", toneColor(card.toneColor))}>{card.pinyin}</div>
          <div className="text-sm text-muted-foreground">{card.gloss}</div>
        </div>
      </div>
      <SoundButton hanzi={card.hanzi} size="lg" className="mt-4" label="Nghe ví dụ" />
      <p className="mt-5 max-w-md rounded-2xl bg-muted/50 p-4 text-sm leading-relaxed text-muted-foreground">
        💡 {card.hint}
      </p>
    </div>
  );
}

// ── Thẻ nghe → chọn phiên âm (listen) ────────────────────────────────────────

export function ListenCardView({
  card,
  onAnswer,
}: {
  card: ListenCard;
  onAnswer: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  // Xáo trộn đáp án một lần khi thẻ xuất hiện (thẻ remount theo từng câu).
  const [options] = useState(() => [...card.options].sort(() => Math.random() - 0.5));

  useEffect(() => {
    speakChinese(card.hanzi);
  }, [card.hanzi]);

  function pick(opt: string) {
    if (selected !== null) return;
    setSelected(opt);
    onAnswer(opt === card.answer);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-medium text-muted-foreground">{card.prompt}</p>
      <div className="mt-6">
        <ReplayRow hanzi={card.hanzi} />
      </div>
      <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-3">
        {options.map((opt) => {
          const answered = selected !== null;
          let state: "idle" | "correct" | "wrong" | "dim" = "idle";
          if (answered) {
            if (opt === card.answer) state = "correct";
            else if (opt === selected) state = "wrong";
            else state = "dim";
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={answered}
              onClick={() => pick(opt)}
              className={cn(
                "font-pinyin rounded-2xl border-2 py-4 text-xl font-semibold transition-all active:scale-[0.98]",
                optionClass(state),
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-5 text-sm">
          <span className="font-chinese text-2xl font-bold">{card.hanzi}</span>{" "}
          <span className="text-muted-foreground">— {card.gloss}</span>
        </div>
      )}
    </div>
  );
}

// ── Thẻ phân biệt cặp âm dễ lẫn (discriminate) ───────────────────────────────

export function DiscriminateCardView({
  card,
  onAnswer,
}: {
  card: DiscriminateCard;
  onAnswer: (correct: boolean) => void;
}) {
  // Phát ngẫu nhiên một trong hai âm; học viên đoán âm vừa nghe (chọn 1 lần khi mount).
  const [played] = useState<"a" | "b">(() => (Math.random() < 0.5 ? "a" : "b"));
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const playedHanzi = played === "a" ? card.a.hanzi : card.b.hanzi;

  useEffect(() => {
    speakChinese(playedHanzi);
  }, [playedHanzi]);

  function pick(key: "a" | "b") {
    if (selected !== null) return;
    setSelected(key);
    onAnswer(key === played);
  }

  const choices: Array<{ key: "a" | "b"; item: DiscriminateCard["a"] }> = [
    { key: "a", item: card.a },
    { key: "b", item: card.b },
  ];

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-medium text-muted-foreground">{card.prompt}</p>
      <div className="mt-6">
        <ReplayRow hanzi={playedHanzi} />
      </div>
      <div className="mt-7 grid w-full max-w-md grid-cols-2 gap-3">
        {choices.map(({ key, item }) => {
          const answered = selected !== null;
          let state: "idle" | "correct" | "wrong" | "dim" = "idle";
          if (answered) {
            if (key === played) state = "correct";
            else if (key === selected) state = "wrong";
            else state = "dim";
          }
          return (
            <button
              key={key}
              type="button"
              disabled={answered}
              onClick={() => pick(key)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 py-4 transition-all active:scale-[0.98]",
                optionClass(state),
              )}
            >
              <span className="font-pinyin text-2xl font-bold">{item.pinyin}</span>
              <span className="font-chinese text-lg">{item.hanzi}</span>
              <span className="text-xs text-muted-foreground">{item.gloss}</span>
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <p className="mt-5 max-w-md rounded-2xl bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
          💡 {card.note}
        </p>
      )}
    </div>
  );
}

// ── Thẻ nghe → chọn thanh điệu (tone) ────────────────────────────────────────

const TONE_OPTIONS = [1, 2, 3, 4, 0];

export function ToneCardView({
  card,
  onAnswer,
}: {
  card: ToneCard;
  onAnswer: (correct: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    speakChinese(card.hanzi);
  }, [card.hanzi]);

  function pick(tone: number) {
    if (selected !== null) return;
    setSelected(tone);
    onAnswer(tone === card.tone);
  }

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm font-medium text-muted-foreground">{card.prompt}</p>
      <div className="mt-6">
        <ReplayRow hanzi={card.hanzi} />
      </div>
      <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-3 sm:grid-cols-5">
        {TONE_OPTIONS.map((tone) => {
          const answered = selected !== null;
          let state: "idle" | "correct" | "wrong" | "dim" = "idle";
          if (answered) {
            if (tone === card.tone) state = "correct";
            else if (tone === selected) state = "wrong";
            else state = "dim";
          }
          return (
            <button
              key={tone}
              type="button"
              disabled={answered}
              onClick={() => pick(tone)}
              className={cn(
                "rounded-2xl border-2 py-3 text-sm font-semibold transition-all active:scale-[0.98]",
                state === "idle" && toneColor(tone),
                optionClass(state),
              )}
            >
              {TONE_SHORT[tone]}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="mt-5 text-sm">
          <span className="font-chinese text-2xl font-bold">{card.hanzi}</span>{" "}
          <span className={cn("font-pinyin text-lg font-semibold", toneColor(card.tone))}>{card.pinyin}</span>
        </div>
      )}
    </div>
  );
}
