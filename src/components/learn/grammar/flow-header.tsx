"use client";
import Link from "next/link";
import { X, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface Props {
  progress: number;
  closeHref: string;
  /** When provided, shows a "Lý thuyết" button to re-open the theory review. */
  onReviewTheory?: () => void;
}

/** Shared top bar for the flashcard + test phases: exit, progress, and the
 *  always-available "review theory" affordance. */
export function FlowHeader({ progress, closeHref, onReviewTheory }: Props) {
  return (
    <div className="flex items-center gap-3 py-4">
      <Link
        href={closeHref}
        className="text-muted-foreground hover:text-foreground"
        aria-label="Thoát"
      >
        <X className="h-5 w-5" />
      </Link>
      <Progress value={progress} className="h-3 flex-1" />
      {onReviewTheory && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReviewTheory}
          className="shrink-0 gap-1.5 text-xs"
        >
          <BookOpen className="h-4 w-4" /> Lý thuyết
        </Button>
      )}
    </div>
  );
}
