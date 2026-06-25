"use client";
import { Flame } from "lucide-react";

interface StreakFlameProps {
  streak: number;
}

export function StreakFlame({ streak }: StreakFlameProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Flame
        className={streak > 0 ? "h-6 w-6 text-orange-500 fill-orange-400" : "h-6 w-6 text-muted-foreground"}
      />
      <div>
        <div className="font-bold text-lg leading-none">{streak}</div>
        <div className="text-xs text-muted-foreground">ngày streak</div>
      </div>
    </div>
  );
}
