"use client";
import Link from "next/link";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TestShellProps {
  subtitle: string;
  backHref: string;
  elapsedLabel?: string;
  tools?: React.ReactNode;
  onSubmit?: () => void;
  submitting?: boolean;
  submitted?: boolean;
  submitLabel?: string;
  nav?: React.ReactNode;
  children: React.ReactNode;
}

export function TestShell({
  subtitle,
  backHref,
  elapsedLabel,
  tools,
  onSubmit,
  submitting,
  submitted,
  submitLabel = "Nộp bài",
  nav,
  children,
}: TestShellProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#faf7f2]">
      {/* Top toolbar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-white/90 px-3 backdrop-blur sm:gap-3 sm:px-4">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Thoát</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">
            中
          </span>
          <span className="hidden text-sm font-semibold sm:inline">
            DingDong <span className="font-normal text-muted-foreground">/ {subtitle}</span>
          </span>
        </div>

        <div className="flex-1" />

        {tools}
        {elapsedLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-sm font-semibold tabular-nums">
            <Clock className="h-4 w-4 text-muted-foreground" /> {elapsedLabel}
          </span>
        )}
        {!submitted && onSubmit && (
          <Button onClick={onSubmit} disabled={submitting} className="gap-1.5 rounded-lg">
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">{submitLabel}</span>
          </Button>
        )}
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>

      {/* Bottom question navigator */}
      {nav && (
        <footer className="shrink-0 border-t bg-white/95 px-3 py-2.5 backdrop-blur sm:px-4">{nav}</footer>
      )}
    </div>
  );
}

interface QuestionNavBarProps {
  partLabel?: string;
  total: number;
  answered: boolean[];
  current?: number;
  correctness?: (boolean | undefined)[];
  onJump: (i: number) => void;
}

export function QuestionNavBar({
  partLabel,
  total,
  answered,
  current,
  correctness,
  onJump,
}: QuestionNavBarProps) {
  return (
    <div className="flex items-center gap-2">
      {partLabel && (
        <span className="shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
          {partLabel}
        </span>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: total }).map((_, i) => {
          const c = correctness?.[i];
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                c === true
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : c === false
                    ? "border-rose-500 bg-rose-500 text-white"
                    : i === current
                      ? "border-primary bg-primary text-primary-foreground"
                      : answered[i]
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-input bg-background text-muted-foreground hover:border-primary/40"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
