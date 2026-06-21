"use client";
import { Volume2, MapPin, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { playWord } from "@/lib/speech";
import type { TheorySection } from "@/types";

/** Only render an image for a real-looking URL (absolute http(s) or a rooted
 *  path, no whitespace) — so a leftover template placeholder like
 *  "https://... (tùy chọn)" never shows as a broken image. */
function isImageUrl(u?: string): boolean {
  return !!u && /^(https?:\/\/|\/)\S+$/.test(u.trim());
}

/** Renders one grammar structure beautifully: title, an optional illustration,
 *  the FRAMED formula (đóng khung công thức), a callout explanation, and the
 *  situational examples (each tappable for audio). Reads only theory fields, so
 *  it accepts a full GrammarSection too. */
export function TheoryViewer({ section }: { section: TheorySection }) {
  return (
    <div className="space-y-5">
      {/* Title */}
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
        {section.titleZh && (
          <p className="font-chinese text-lg text-violet-600">{section.titleZh}</p>
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

      {/* Framed formula */}
      {section.structure && (
        <div className="relative rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white px-5 py-5 text-center shadow-sm">
          <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            Công thức
          </span>
          <div className="font-chinese text-2xl font-bold leading-relaxed text-violet-900">
            {section.structure}
          </div>
        </div>
      )}

      {/* Explanation callout */}
      {section.explanation && (
        <div className="rounded-xl border-l-4 border-violet-400 bg-violet-50/60 px-4 py-3">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">
            {section.explanation}
          </p>
        </div>
      )}

      {/* Situational examples */}
      {section.examples.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4 text-amber-500" /> Ví dụ theo ngữ cảnh
          </div>
          {section.examples.map((ex, i) => (
            <Card key={i} className="overflow-hidden border-l-4 border-l-amber-300">
              <CardContent className="space-y-2 p-4">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
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
                <button
                  type="button"
                  onClick={() => playWord({ hanzi: ex.hanzi })}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="font-chinese text-xl font-semibold leading-relaxed">
                    {ex.hanzi}
                  </span>
                  <Volume2 className="h-4 w-4 shrink-0 text-violet-400" />
                </button>
                <div className="font-serif text-sm text-violet-600">{ex.pinyin}</div>
                <div className="text-sm text-foreground/80">{ex.meaning}</div>
                {ex.note && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
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
