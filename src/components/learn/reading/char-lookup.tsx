"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getTone } from "@/lib/pinyin";
import { toneColor, cn } from "@/lib/utils";
import { lookupHanziAction, type HanziLookupResult } from "@/server/actions/hanzi-lookup";

const TONE_NAME: Record<number, string> = {
  1: "Thanh 1 (ngang)",
  2: "Thanh 2 (lên)",
  3: "Thanh 3 (xuống-lên)",
  4: "Thanh 4 (xuống)",
  0: "Thanh nhẹ",
};

export interface LookupAnchor {
  char: string;
  pinyin: string;
  x: number;
  y: number;
}

function firstExample(examples: unknown): string | null {
  if (!Array.isArray(examples) || examples.length === 0) return null;
  const e = examples[0] as Record<string, unknown>;
  const text = (e?.sentence ?? e?.hanzi ?? e?.text) as string | undefined;
  return typeof text === "string" && text ? text : null;
}

export function CharLookup({ anchor, onClose }: { anchor: LookupAnchor; onClose: () => void }) {
  const [info, setInfo] = useState<HanziLookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setInfo(null);
    lookupHanziAction(anchor.char).then((r) => {
      if (active) {
        setInfo(r);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [anchor.char]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    // Capture-phase scroll so scrolling the passage pane (an inner scroll
    // container) dismisses the popup instead of leaving it floating.
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const tone = getTone(anchor.pinyin);
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const W = 256;
  const left = Math.min(Math.max(anchor.x - W / 2, 10), vw - W - 10);
  const placeAbove = anchor.y > vh * 0.58;
  const style: React.CSSProperties = { left, width: W, position: "fixed", zIndex: 60, maxHeight: "70dvh" };
  if (placeAbove) style.bottom = vh - anchor.y + 14;
  else style.top = anchor.y + 16;

  const example = firstExample(info?.examples);

  return (
    <div
      ref={ref}
      style={style}
      className="animate-fade-in overflow-y-auto rounded-2xl border bg-white p-3.5 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <span className={cn("font-chinese text-4xl leading-none", toneColor(tone))}>{anchor.char}</span>
        <div className="min-w-0 flex-1">
          <div className="font-pinyin text-base font-semibold">{anchor.pinyin}</div>
          <div className="text-xs text-muted-foreground">{TONE_NAME[tone]}</div>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 border-t pt-2 text-sm">
        {loading ? (
          <span className="text-xs text-muted-foreground">Đang tra cứu…</span>
        ) : info ? (
          <>
            <p className="font-medium leading-snug">{info.meaning}</p>
            {example && <p className="mt-1 font-chinese text-xs text-muted-foreground">{example}</p>}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Chưa có nghĩa trong từ điển.</span>
        )}
      </div>
    </div>
  );
}
