"use client";
import { useState } from "react";
import { Volume2 } from "lucide-react";
import { speakChinese } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Nút "nghe": phát âm một chữ Hán qua Web Speech (zh-CN). Dùng khắp module phiên
 * âm — bảng tra cứu, thẻ học, thẻ quiz. TTS đọc chữ Hán chính xác hơn đọc pinyin
 * rời, nên luôn truyền `hanzi`.
 */
export function SoundButton({
  hanzi,
  label = "Nghe",
  size = "md",
  className,
}: {
  hanzi: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  function play() {
    speakChinese(hanzi);
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), 600);
  }

  const sizes = {
    sm: "h-8 gap-1 px-2.5 text-xs",
    md: "h-10 gap-1.5 px-3.5 text-sm",
    lg: "h-12 gap-2 px-5 text-base",
  } as const;
  const icon = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" } as const;

  return (
    <button
      type="button"
      onClick={play}
      aria-label={`Nghe phát âm ${hanzi}`}
      className={cn(
        "inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 font-semibold text-amber-700 transition-all hover:bg-amber-100 active:scale-95 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300",
        sizes[size],
        playing && "ring-2 ring-amber-400",
        className,
      )}
    >
      <Volume2 className={cn(icon[size], playing && "animate-pulse")} />
      {label}
    </button>
  );
}
