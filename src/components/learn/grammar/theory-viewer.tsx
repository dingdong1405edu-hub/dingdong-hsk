"use client";
import { Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { playWord } from "@/lib/speech";
import type { TheorySection } from "@/types";

/** Renders one grammar structure: title, the pattern chip, a plain-language
 *  explanation, and its situational examples (each tappable to hear audio). */
export function TheoryViewer({ section }: { section: TheorySection }) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold">{section.title}</h2>
        {section.titleZh && (
          <p className="font-chinese text-muted-foreground">{section.titleZh}</p>
        )}
      </div>

      {section.structure && (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-center">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Cấu trúc
          </div>
          <div className="font-chinese text-lg font-semibold">{section.structure}</div>
        </div>
      )}

      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {section.explanation}
      </p>

      {section.examples.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-muted-foreground">Ví dụ tình huống</div>
          {section.examples.map((ex, i) => (
            <Card key={i}>
              <CardContent className="space-y-1 p-3">
                <div className="text-xs font-medium text-primary">{ex.situation}</div>
                <button
                  type="button"
                  onClick={() => playWord({ hanzi: ex.hanzi })}
                  className="flex items-center gap-2 text-left"
                >
                  <span className="font-chinese text-lg font-semibold">{ex.hanzi}</span>
                  <Volume2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
                <div className="text-sm text-muted-foreground">{ex.pinyin}</div>
                <div className="text-sm">{ex.meaning}</div>
                {ex.note && (
                  <div className="text-xs italic text-amber-600">Lưu ý: {ex.note}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
