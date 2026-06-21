"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TheoryViewer } from "./theory-viewer";
import type { TheorySection } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: TheorySection[];
}

/** "Xem lại lý thuyết" — a scrollable overlay listing every theory section, so
 *  learners can review the rules at any point during flashcards or the test
 *  without losing their progress in the underlying phase. */
export function TheoryReviewDialog({ open, onOpenChange, sections }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lý thuyết</DialogTitle>
          <DialogDescription>Xem lại các cấu trúc ngữ pháp của bài học.</DialogDescription>
        </DialogHeader>
        <div className="space-y-8 pt-2">
          {sections.map((section, i) => (
            <div key={section.id || i}>
              {i > 0 && <div className="mb-6 border-t" />}
              <TheoryViewer section={section} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
