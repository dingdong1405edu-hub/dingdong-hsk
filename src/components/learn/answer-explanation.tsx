"use client";
import { useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Nội dung giải thích. Rỗng/null → không render gì. */
  explanation?: string | null;
  className?: string;
  /** Mặc định mở (chữa bài) hay đóng (chỉ hiện nút bấm để xem). */
  defaultOpen?: boolean;
}

/**
 * Hộp "Giải thích đáp án" dùng chung cho MỌI câu quiz/trắc nghiệm trong app.
 * Luôn có nút bấm để mở/đóng, hiển thị cho CẢ câu đúng lẫn sai — học viên không
 * còn chỉ thấy mỗi chữ "Chính xác" khi trả lời đúng.
 */
export function AnswerExplanation({ explanation, className, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  if (!explanation) return null;
  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/15 dark:text-amber-200",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-xs font-semibold"
      >
        <Lightbulb className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1">Giải thích đáp án</span>
        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-2.5 pb-2.5 text-xs leading-relaxed">{explanation}</div>}
    </div>
  );
}
