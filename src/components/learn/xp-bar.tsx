"use client";
import { Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { xpToLevel } from "@/lib/utils";

interface XPBarProps {
  xp: number;
}

export function XPBar({ xp }: XPBarProps) {
  const { level, progress, next } = xpToLevel(xp);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1 font-semibold">
          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          Cấp {level}
        </span>
        <span className="text-muted-foreground text-xs">{xp} / {next} XP</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
