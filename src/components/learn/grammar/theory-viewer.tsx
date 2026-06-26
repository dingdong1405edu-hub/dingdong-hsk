"use client";
import { Fragment } from "react";
import { Volume2, MapPin, Lightbulb, Sparkles, Target, AlertTriangle, ListTree } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { playWord } from "@/lib/speech";
import { LookupText } from "./lookup-text";
import type { TheorySection } from "@/types";

/** Only render an image for a real-looking URL (absolute http(s) or a rooted
 *  path, no whitespace) — so a leftover template placeholder like
 *  "https://... (tùy chọn)" never shows as a broken image. */
function isImageUrl(u?: string): boolean {
  return !!u && /^(https?:\/\/|\/)\S+$/.test(u.trim());
}

/** Does a token contain a Han character? Used to switch on the Chinese font for
 *  real words while leaving Latin placeholders (A, B, Adj…) in the UI font. */
const HAS_HAN = /[一-鿿]/;
function han(s: string): boolean {
  return HAS_HAN.test(s);
}

/** Colour bundles for formula parts — the chip, its number badge, the card's
 *  left accent and the role pill all share one colour, so a chip in the formula
 *  visually links to its explanation card below. Indexed by part position. */
const PART_COLORS = [
  {
    chip: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-500/45 dark:bg-sky-500/15 dark:text-sky-100",
    badge: "bg-sky-500 text-white",
    accent: "border-l-sky-400 dark:border-l-sky-500/50",
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200",
  },
  {
    chip: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-500/45 dark:bg-rose-500/15 dark:text-rose-100",
    badge: "bg-rose-500 text-white",
    accent: "border-l-rose-400 dark:border-l-rose-500/50",
    pill: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200",
  },
  {
    chip: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/45 dark:bg-emerald-500/15 dark:text-emerald-100",
    badge: "bg-emerald-500 text-white",
    accent: "border-l-emerald-400 dark:border-l-emerald-500/50",
    pill: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200",
  },
  {
    chip: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/45 dark:bg-amber-500/15 dark:text-amber-100",
    badge: "bg-amber-500 text-white",
    accent: "border-l-amber-400 dark:border-l-amber-500/50",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  },
  {
    chip: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-500/45 dark:bg-violet-500/15 dark:text-violet-100",
    badge: "bg-violet-500 text-white",
    accent: "border-l-violet-400 dark:border-l-violet-500/50",
    pill: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  },
  {
    chip: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-500/45 dark:bg-fuchsia-500/15 dark:text-fuchsia-100",
    badge: "bg-fuchsia-500 text-white",
    accent: "border-l-fuchsia-400 dark:border-l-fuchsia-500/50",
    pill: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
  },
] as const;

function colorAt(i: number) {
  return PART_COLORS[i % PART_COLORS.length];
}

/** Split a formula like "A + 是 + B" into its trimmed tokens. */
function splitFormula(structure: string): string[] {
  return structure
    .split("+")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** A small uppercase section heading with an icon. */
function SectionLabel({
  icon: Icon,
  children,
  className,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 text-sm font-semibold", className)}>
      <Icon className="h-4 w-4" /> {children}
    </div>
  );
}

/** Render the free-text explanation: a single paragraph stays as-is, but multiple
 *  lines become tidy rows with bullet dots for "-", "•" or "*" prefixed lines. */
function ExplanationBody({ text }: { text: string }) {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return (
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{text}</p>
    );
  }
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const bullet = /^[-–•*]\s+/.test(line);
        const content = bullet ? line.replace(/^[-–•*]\s+/, "") : line;
        return (
          <div key={i} className="flex gap-2 text-[15px] leading-relaxed text-foreground/90">
            {bullet && (
              <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 dark:bg-violet-300" />
            )}
            <span>{content}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Renders one grammar structure for a beginner: the title, an optional image,
 *  the FRAMED formula split into colour-coded parts, a per-part breakdown (each
 *  part explained in its own card), a "when to use" note, the explanation,
 *  common mistakes, and the situational examples (each tappable for audio).
 *  Reads only theory fields, so it accepts a full GrammarSection too. */
export function TheoryViewer({ section }: { section: TheorySection }) {
  const breakdown = section.breakdown ?? [];
  const hasBreakdown = breakdown.length > 0;

  // The formula chips: build from the authored breakdown when present (so chips
  // and their cards share colours by index), else split the raw structure.
  const chips = hasBreakdown
    ? breakdown.map((p) => p.part)
    : section.structure
      ? splitFormula(section.structure)
      : [];

  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
        {section.titleZh && (
          <p className="font-chinese text-lg text-violet-600 dark:text-violet-300">{section.titleZh}</p>
        )}
      </div>

      {/* Optional section illustration */}
      {isImageUrl(section.imageUrl) && (
        <div className="overflow-hidden rounded-2xl border bg-muted/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={section.imageUrl}
            alt={section.title}
            className="mx-auto max-h-64 w-full object-contain"
          />
        </div>
      )}

      {/* Framed formula — each part as a colour-coded chip */}
      {chips.length > 0 && (
        <div className="relative rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-white dark:from-violet-500/15 dark:to-transparent px-4 py-6 shadow-sm">
          <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Công thức
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2.5">
            {chips.map((c, i) => {
              const color = colorAt(i);
              return (
                <Fragment key={i}>
                  {i > 0 && (
                    <span className="text-2xl font-bold text-violet-300 dark:text-violet-500/60">+</span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-2xl font-bold leading-none",
                      color.chip,
                      han(c) && "font-chinese"
                    )}
                  >
                    {hasBreakdown && (
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                          color.badge
                        )}
                      >
                        {i + 1}
                      </span>
                    )}
                    {c}
                  </span>
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-part breakdown — the headline feature: every part explained */}
      {hasBreakdown && (
        <div className="space-y-2.5">
          <SectionLabel icon={ListTree} className="text-violet-700 dark:text-violet-300">
            Giải nghĩa từng phần
          </SectionLabel>
          {breakdown.map((p, i) => {
            const color = colorAt(i);
            return (
              <div
                key={i}
                className={cn("rounded-xl border border-l-4 bg-card px-4 py-3", color.accent)}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                      color.badge
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className={cn("text-xl font-bold", han(p.part) && "font-chinese")}>
                        {p.part}
                      </span>
                      {p.pinyin && (
                        <span className="font-serif text-sm text-muted-foreground">{p.pinyin}</span>
                      )}
                      {p.role && (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            color.pill
                          )}
                        >
                          {p.role}
                        </span>
                      )}
                    </div>
                    {p.meaning && (
                      <p className="text-sm leading-relaxed text-foreground/85">{p.meaning}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* When to use */}
      {section.usage && (
        <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50/70 dark:bg-sky-500/10 px-4 py-3">
          <SectionLabel icon={Target} className="mb-1 text-sky-700 dark:text-sky-300">
            Khi nào dùng
          </SectionLabel>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {section.usage}
          </p>
        </div>
      )}

      {/* Explanation callout */}
      {section.explanation && (
        <div className="rounded-xl border-l-4 border-violet-400 dark:border-violet-500/40 bg-violet-50/60 dark:bg-violet-500/10 px-4 py-3">
          <SectionLabel icon={Lightbulb} className="mb-1.5 text-violet-700 dark:text-violet-300">
            Giải thích
          </SectionLabel>
          <ExplanationBody text={section.explanation} />
        </div>
      )}

      {/* Common mistakes */}
      {section.mistakes && section.mistakes.length > 0 && (
        <div className="space-y-2.5">
          <SectionLabel icon={AlertTriangle} className="text-red-600 dark:text-red-400">
            Lỗi thường gặp
          </SectionLabel>
          {section.mistakes.map((m, i) => (
            <div
              key={i}
              className="space-y-1.5 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-500/10 px-4 py-3"
            >
              {m.wrong && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-red-500">✕</span>
                  <span
                    className={cn(
                      "text-base text-red-700/90 line-through decoration-red-400/70 dark:text-red-300/90",
                      han(m.wrong) && "font-chinese"
                    )}
                  >
                    {m.wrong}
                  </span>
                </div>
              )}
              {m.right && (
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 font-bold text-green-600 dark:text-green-400">✓</span>
                  <LookupText
                    text={m.right}
                    className={cn("text-base font-semibold", han(m.right) && "font-chinese")}
                  />
                  <button
                    type="button"
                    onClick={() => playWord({ hanzi: m.right })}
                    aria-label="Nghe câu đúng"
                    className="mt-0.5 shrink-0 text-green-500 transition-colors hover:text-green-700 dark:hover:text-green-300"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              {m.note && <p className="pl-6 text-xs text-muted-foreground">{m.note}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Situational examples */}
      {section.examples.length > 0 && (
        <div className="space-y-2.5">
          <SectionLabel icon={Sparkles} className="text-amber-600 dark:text-amber-400">
            Ví dụ theo ngữ cảnh
          </SectionLabel>
          {section.examples.map((ex, i) => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-amber-300 dark:border-l-amber-500/40">
              <CardContent className="space-y-2 p-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <MapPin className="h-3 w-3" /> {ex.situation}
                </div>
                {isImageUrl(ex.imageUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ex.imageUrl}
                    alt={ex.situation}
                    className="max-h-48 w-full rounded-lg border object-contain"
                  />
                )}
                <div className="flex w-full items-start gap-2 text-left">
                  <LookupText
                    text={ex.hanzi}
                    className="text-xl font-semibold leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => playWord({ hanzi: ex.hanzi })}
                    aria-label="Nghe ví dụ"
                    className="mt-1 shrink-0 text-violet-400 transition-colors hover:text-violet-600 dark:text-violet-300 dark:hover:text-violet-200"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="font-serif text-sm text-violet-600 dark:text-violet-300">{ex.pinyin}</div>
                <div className="text-sm text-foreground/80">{ex.meaning}</div>
                {ex.note && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{ex.note}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
