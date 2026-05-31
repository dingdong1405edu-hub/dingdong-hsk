"use client";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeartBarProps {
  hearts: number;
  maxHearts?: number;
}

export function HeartBar({ hearts, maxHearts = 5 }: HeartBarProps) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxHearts }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            "h-5 w-5 transition-all",
            i < hearts
              ? "fill-rose-500 text-rose-500"
              : "text-zinc-200 fill-zinc-200"
          )}
        />
      ))}
    </div>
  );
}
