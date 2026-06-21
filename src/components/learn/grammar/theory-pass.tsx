"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TheoryViewer } from "./theory-viewer";
import type { TheorySection } from "@/types";

interface Props {
  sections: TheorySection[];
  closeHref: string;
  /** Called once the learner reaches the end of the single theory pass. */
  onDone: () => void;
}

/** The initial single pass through the lesson's theory, section by section.
 *  Learners can revisit any time afterwards via the "Lý thuyết" review dialog. */
export function TheoryPass({ sections, closeHref, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const last = index >= sections.length - 1;
  const progress = Math.round(((index + 1) / sections.length) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 py-4">
        <Link
          href={closeHref}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Thoát"
        >
          <X className="h-5 w-5" />
        </Link>
        <Progress value={progress} className="h-3 flex-1" />
      </div>

      <div className="pb-2 text-center text-sm text-muted-foreground">
        Lý thuyết · Mục {index + 1}/{sections.length}
      </div>

      <div className="flex flex-1 flex-col justify-center py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <TheoryViewer section={sections[index]} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-2 border-t py-4">
        <Button
          variant="ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Trước
        </Button>
        {last ? (
          <Button onClick={onDone}>
            Bắt đầu luyện tập
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(sections.length - 1, i + 1))}>
            Tiếp tục
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
