"use client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeartBarProps {
  hearts: number;
  maxHearts?: number;
  unlimited?: boolean;
}

export function HeartBar({ hearts, maxHearts = 5, unlimited = false }: HeartBarProps) {
  if (unlimited) {
    return (
      <div className="flex items-center gap-1 text-rose-500" title="Tim không giới hạn">
        <Heart className="h-5 w-5 fill-rose-500" />
        <span className="text-sm font-bold leading-none">∞</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "h-5 w-5 transition-all",
            i < hearts
              ? "fill-rose-500 text-rose-500"
              : "text-muted-foreground/40 fill-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}
