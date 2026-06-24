"use client";
import { useEffect, useMemo, useRef } from "react";
import { Languages, Highlighter } from "lucide-react";
import { PinyinText } from "@/components/learn/pinyin-text";
import { cn, coverChar, coverGradient, countChineseChars, hskBadgeClass, hskLevelLabel } from "@/lib/utils";
import type { ReadingSettings, ReadingTestData } from "./types";

interface PassagePaneProps {
  test: ReadingTestData;
  showPinyin: boolean;
  settings: ReadingSettings;
  /** "lookup" = tô/chạm để tra nghĩa; "highlight" = tô để đánh dấu màu. */
  mode: "lookup" | "highlight";
  highlightColor: string;
  highlights: Record<number, string>;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
  /** Khi học viên kéo bôi đen một cụm chữ Hán trong đoạn văn (chế độ tra nghĩa). */
  onSelectText?: (text: string, x: number, y: number) => void;
  /** Tô màu các segment trong vùng bôi đen (chế độ bút). */
  onHighlight: (indices: number[], color: string) => void;
  /** Xoá tô của một segment khi chạm vào (chế độ bút). */
  onEraseHighlight: (index: number) => void;
  /** "Chỗ chứa đáp án" cần tô sáng + cuộn tới (khi học viên bấm xem ở phần câu hỏi).
   *  `nonce` đổi sau mỗi lần bấm để cuộn lại dù cùng một vị trí. */
  evidence?: { indices: number[]; nonce: number } | null;
}

export function PassagePane({
  test,
  showPinyin,
  settings,
  mode,
  highlightColor,
  highlights,
  onCharClick,
  onSelectText,
  onHighlight,
  onEraseHighlight,
  evidence,
}: PassagePaneProps) {
  const charCount = useMemo(() => countChineseChars(test.passage), [test.passage]);
  const proseRef = useRef<HTMLDivElement>(null);
  const evidenceSet = useMemo(() => new Set(evidence?.indices ?? []), [evidence]);

  // Khi học viên bấm "xem chỗ chứa đáp án": cuộn tới segment đầu tiên của vùng đó.
  // Dep theo `evidence` (object mới mỗi lần bấm nhờ nonce) → cuộn lại cả khi cùng vị trí.
  useEffect(() => {
    if (!evidence || evidence.indices.length === 0) return;
    const el = proseRef.current?.querySelector<HTMLElement>(`[data-idx="${evidence.indices[0]}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [evidence]);
  // Nuốt đúng 1 "click đuôi" của thao tác kéo tô 1 ký tự (click rơi trên chính ruby đó)
  // để tô xong không bị chính click ấy xoá. Kéo tô nhiều ký tự không sinh click trên ruby
  // (rơi vào phần tử cha) nên không cần — và không được — nuốt, tránh chặn nhầm thao tác xoá sau đó.
  const suppressEraseRef = useRef(false);

  // Xử lý kết thúc thao tác bôi đen: tra cụm (lookup) hoặc tô màu (highlight).
  function detectSelection() {
    const sel = typeof window !== "undefined" ? window.getSelection() : null;
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().trim();
    if (!text || !/\p{Script=Han}/u.test(text)) return;

    if (mode === "highlight") {
      const root = proseRef.current;
      const indices: number[] = [];
      const range = sel.getRangeAt(0);
      if (root) {
        root.querySelectorAll<HTMLElement>("[data-idx]").forEach((el) => {
          if (!sel.containsNode(el, true)) return;
          // containsNode(…, true) coi cả phần tử chỉ "chạm mép" là được chứa → loại bỏ
          // phần tử mà vùng chọn kết thúc ngay ở đầu nó (hoặc bắt đầu ngay ở cuối nó),
          // nếu không sẽ tô dư 1 ký tự ở rìa so với phần thực sự bôi đen.
          const elRange = document.createRange();
          elRange.selectNodeContents(el);
          if (range.compareBoundaryPoints(Range.END_TO_START, elRange) >= 0) return;
          if (range.compareBoundaryPoints(Range.START_TO_END, elRange) <= 0) return;
          const idx = Number(el.dataset.idx);
          if (Number.isInteger(idx)) indices.push(idx);
        });
      }
      if (indices.length) {
        onHighlight(indices, highlightColor);
        // Chỉ tô đúng 1 ký tự mới sinh click đuôi trên ruby đó → nuốt 1 click kế tiếp.
        // Hẹn giờ tự gỡ phòng khi click đuôi không xuất hiện (vd trên cảm ứng).
        if (indices.length === 1) {
          suppressEraseRef.current = true;
          setTimeout(() => {
            suppressEraseRef.current = false;
          }, 400);
        }
      }
      sel.removeAllRanges(); // không để vùng bôi kẹt lại sau khi đã tô
      return;
    }

    if (!onSelectText) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    onSelectText(text, rect.left + rect.width / 2, rect.top);
  }

  function handleWordClick(char: string, pinyin: string, e: React.MouseEvent, idx: number) {
    if (mode === "highlight") {
      if (suppressEraseRef.current) {
        suppressEraseRef.current = false; // nuốt đúng click đuôi của thao tác tô vừa rồi
        return;
      }
      onEraseHighlight(idx);
      return;
    }
    onCharClick(char, pinyin, e);
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
            ref={proseRef}
            className={cn("reading-prose mt-5 font-chinese", showPinyin && "ruby-on")}
            onMouseUp={detectSelection}
            onTouchEnd={() => setTimeout(detectSelection, 0)}
          >
            <PinyinText
              text={test.passage}
              showPinyin={showPinyin}
              onWordClick={handleWordClick}
              highlights={highlights}
              evidence={evidenceSet}
            />
          </div>

          <p className="reading-muted mt-7 flex items-center gap-1.5 text-xs text-muted-foreground">
            {mode === "highlight" ? (
              <>
                <Highlighter className="h-3.5 w-3.5" /> Kéo bôi đen để tô màu đánh dấu — chạm vào chỗ đã tô để xoá.
              </>
            ) : (
              <>
                <Languages className="h-3.5 w-3.5" /> Nhấn vào từng chữ — hoặc kéo bôi đen một cụm — để xem pinyin, nghĩa &amp; lưu vào sổ từ.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
