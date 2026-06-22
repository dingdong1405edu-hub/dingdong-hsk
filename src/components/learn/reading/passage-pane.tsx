"use client";
import { useMemo } from "react";
import { Languages } from "lucide-react";
import { PinyinText } from "@/components/learn/pinyin-text";
import { cn, coverChar, coverGradient, countChineseChars, hskBadgeClass, hskLevelLabel } from "@/lib/utils";
import type { ReadingSettings, ReadingTestData } from "./types";

interface PassagePaneProps {
  test: ReadingTestData;
  showPinyin: boolean;
  settings: ReadingSettings;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
  /** Khi học viên kéo bôi đen một cụm chữ Hán trong đoạn văn. */
  onSelectText?: (text: string, x: number, y: number) => void;
}

export function PassagePane({ test, showPinyin, settings, onCharClick, onSelectText }: PassagePaneProps) {
  const charCount = useMemo(() => countChineseChars(test.passage), [test.passage]);

  // Bôi đen (kéo tô) một cụm chữ → tra cứu cả cụm. Click 1 chữ vẫn do ruby xử lý
  // riêng (lúc đó selection rỗng nên bỏ qua ở đây).
  function detectSelection() {
    if (!onSelectText) return;
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (!text || !/\p{Script=Han}/u.test(text)) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    onSelectText(text, rect.left + rect.width / 2, rect.top);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Pane header */}
      <div className="flex shrink-0 items-center justify-between border-b bg-white/70 px-4 py-2 backdrop-blur">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Đoạn văn</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {charCount} chữ
        </span>
      </div>

      {/* Scrollable reading surface (theme + font vars applied here) */}
      <div
        className={cn("reading-surface min-h-0 flex-1 overflow-y-auto", `reading-theme-${settings.theme}`)}
        style={
          {
            "--reading-fontsize": `${settings.fontSize}px`,
            "--reading-leading": `${settings.leading}`,
          } as React.CSSProperties
        }
      >
        <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 sm:py-7">
          {/* Cover */}
          {test.imageUrl ? (
            <div className="relative mb-5 overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={test.imageUrl} alt={test.title} className="h-44 w-full object-cover sm:h-56" />
              <span
                className={cn(
                  "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow",
                  hskBadgeClass(test.hskLevel),
                )}
              >
                {hskLevelLabel(test.hskLevel)}
              </span>
            </div>
          ) : (
            <div
              className={cn(
                "relative mb-5 flex h-32 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br",
                coverGradient(test.id),
              )}
            >
              <span className="font-chinese text-7xl text-white/25">{coverChar(test.id)}</span>
              <span
                className={cn(
                  "absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow",
                  hskBadgeClass(test.hskLevel),
                )}
              >
                {hskLevelLabel(test.hskLevel)}
              </span>
            </div>
          )}

          <h1 className="font-display text-xl font-bold leading-tight sm:text-2xl">{test.title}</h1>
          <p className="reading-muted font-chinese text-sm text-muted-foreground">{test.titleZh}</p>

          <div
            className={cn("reading-prose mt-5 font-chinese", showPinyin && "ruby-on")}
            onMouseUp={detectSelection}
            onTouchEnd={() => setTimeout(detectSelection, 0)}
          >
            <PinyinText text={test.passage} showPinyin={showPinyin} onWordClick={onCharClick} />
          </div>

          <p className="reading-muted mt-7 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> Nhấn vào từng chữ — hoặc kéo bôi đen một cụm — để xem pinyin, nghĩa &amp; lưu vào sổ từ.
          </p>
        </div>
      </div>
    </div>
  );
}
