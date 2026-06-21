"use client";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowHeader } from "./flow-header";
import { TheoryViewer } from "./theory-viewer";
import type { GrammarSection } from "@/types";

interface Props {
  section: GrammarSection;
  sectionIndex: number;
  sectionCount: number;
  progress: number;
  closeHref: string;
  ctaLabel: string;
  onReviewTheory?: () => void;
  onContinue: () => void;
}

/** One section's theory screen. The learner studies this part, then taps the
 *  CTA to drill the exercises for THIS part immediately (interleaved flow). */
export function SectionTheory({
  section,
  sectionIndex,
  sectionCount,
  progress,
  closeHref,
  ctaLabel,
  onReviewTheory,
  onContinue,
}: Props) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      <FlowHeader progress={progress} closeHref={closeHref} onReviewTheory={onReviewTheory} />

      <div className="pb-2 text-center text-sm text-muted-foreground">
        Phần {sectionIndex + 1}/{sectionCount} · Lý thuyết
      </div>

      <div className="flex-1 py-4">
        <motion.div
          key={section.id || sectionIndex}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <TheoryViewer section={section} />
        </motion.div>
      </div>

      <div className="flex justify-end border-t py-4">
        <Button size="lg" onClick={onContinue}>
          {ctaLabel}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
