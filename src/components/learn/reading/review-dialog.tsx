"use client";
import { Send, Flag, CircleHelp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  total: number;
  answeredCount: number;
  unanswered: number[];
  flagged: number[];
  onJump: (i: number) => void;
  onConfirm: () => void;
  submitting: boolean;
}

function Chips({
  nums,
  className,
  onJump,
  onOpenChange,
}: {
  nums: number[];
  className: string;
  onJump: (i: number) => void;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {nums.map((i) => (
        <button
          key={i}
          onClick={() => {
            onJump(i);
            onOpenChange(false);
          }}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-transform hover:scale-110",
            className,
          )}
        >
          {i + 1}
        </button>
      ))}
    </div>
  );
}

export function ReviewDialog({
  open,
  onOpenChange,
  total,
  answeredCount,
  unanswered,
  flagged,
  onJump,
  onConfirm,
  submitting,
}: ReviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Xem lại trước khi nộp</DialogTitle>
          <DialogDescription>
            Bạn đã trả lời <b>{answeredCount}/{total}</b> câu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {unanswered.length > 0 && (
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-300">
                <CircleHelp className="h-4 w-4" /> Chưa trả lời ({unanswered.length})
              </span>
              <Chips
                nums={unanswered}
                className="border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300"
                onJump={onJump}
                onOpenChange={onOpenChange}
              />
            </div>
          )}

          {flagged.length > 0 && (
            <div className="space-y-1.5">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 dark:text-amber-300">
                <Flag className="h-4 w-4" /> Đã gắn cờ ({flagged.length})
              </span>
              <Chips
                nums={flagged}
                className="border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-300"
                onJump={onJump}
                onOpenChange={onOpenChange}
              />
            </div>
          )}

          {unanswered.length === 0 && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              Tuyệt vời — bạn đã trả lời hết các câu hỏi! 🎉
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Tiếp tục làm bài
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="gap-1.5">
            <Send className="h-4 w-4" /> {submitting ? "Đang nộp…" : "Nộp bài"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
