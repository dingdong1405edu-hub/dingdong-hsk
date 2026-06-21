"use client";

import { motion } from "framer-motion";
import { Check, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseTheme, LessonStatus } from "@/lib/roadmap";

interface LessonNodeProps {
  status: LessonStatus;
  kind?: "lesson" | "trophy";
  order?: number;
  icon?: string | null;
  label?: string;
  theme: CourseTheme;
  size?: number;
  onClick: () => void;
}

const LEDGE = 6;

/**
 * Một node trên bản đồ học — nút tròn kiểu 3D (có gờ bóng đổ) như Duolingo.
 * Trạng thái: done (đã xong, có dấu ✓) · current (đang học, có vòng nhịp + bong
 * bóng "Bắt đầu") · locked (khóa). `kind="trophy"` là mốc thưởng cuối chương.
 */
export function LessonNode({
  status,
  kind = "lesson",
  order,
  icon,
  label,
  theme,
  size = 76,
  onClick,
}: LessonNodeProps) {
  const isTrophy = kind === "trophy";
  const locked = status === "locked";
  const current = status === "current";
  const done = status === "done";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 10 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ type: "spring", stiffness: 320, damping: 20 }}
      style={{ width: size, height: size }}
      className="relative"
    >
      {/* Bong bóng "BẮT ĐẦU" cho bài hiện tại */}
      {current && !isTrophy && (
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-xl bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-soft-lg"
        >
          <span className={theme.accentText}>Bắt đầu</span>
          <span className="absolute -bottom-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white" />
        </motion.div>
      )}

      {/* Vòng nhịp quanh node hiện tại */}
      {current && (
        <motion.span
          aria-hidden
          animate={{ scale: [1, 1.18, 1], opacity: [0.65, 0, 0.65] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          className={cn("absolute inset-0 rounded-full ring-4", theme.ring)}
        />
      )}

      <button
        type="button"
        onClick={onClick}
        aria-label={`${label ?? (isTrophy ? "Phần thưởng chương" : `Bài ${order}`)}${locked ? " — đã khoá" : ""}`}
        aria-disabled={locked || undefined}
        className="group relative block h-full w-full focus:outline-none"
      >
        {/* Gờ 3D phía dưới */}
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-full",
            locked ? "bg-zinc-300" : isTrophy ? "bg-amber-600" : theme.nodeBase,
          )}
          style={{ top: LEDGE }}
        />
        {/* Mặt node */}
        <span
          className={cn(
            "absolute inset-x-0 top-0 flex items-center justify-center rounded-full text-3xl leading-none transition-transform duration-100 group-active:translate-y-[3px]",
            locked
              ? "bg-zinc-200 text-zinc-400"
              : isTrophy
                ? "bg-gradient-to-b from-amber-300 to-amber-500 text-white"
                : cn(theme.nodeFace, "text-white"),
            current && !locked && cn("shadow-lg", theme.glow),
          )}
          style={{ bottom: LEDGE }}
        >
          {isTrophy ? (
            <Trophy className={cn("h-7 w-7", locked ? "" : "fill-amber-200")} />
          ) : locked ? (
            <Lock className="h-6 w-6" />
          ) : icon ? (
            <span className="drop-shadow-sm">{icon}</span>
          ) : (
            <span className="font-display text-xl font-extrabold">{order}</span>
          )}
        </span>

        {/* Huy hiệu hoàn thành */}
        {done && !isTrophy && (
          <span className="absolute -right-0.5 -top-0.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
            <Check className={cn("h-4 w-4", theme.accentText)} strokeWidth={3} />
          </span>
        )}
      </button>
    </motion.div>
  );
}
