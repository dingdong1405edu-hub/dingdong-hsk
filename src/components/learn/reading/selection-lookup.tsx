"use client";
import { useEffect, useRef, useState } from "react";
import { X, BookmarkPlus, BookmarkCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getTone } from "@/lib/pinyin";
import { toneColor, cn } from "@/lib/utils";
import { lookupHanziAction } from "@/server/actions/hanzi-lookup";
import { saveWordAction } from "@/server/actions/saved-word";

export interface SelectionAnchor {
  text: string;
  x: number;
  y: number;
}

interface Entry {
  char: string;
  pinyin: string;
  meaning: string;
  hskLevel: string;
}

/**
 * Popup khi học viên kéo bôi đen một CỤM chữ trong bài đọc. Tra từng chữ Hán
 * trong cụm (chỉ hiện chữ có trong từ điển) kèm pinyin + nghĩa, và cho lưu từng
 * chữ vào sổ từ.
 */
export function SelectionLookup({
  anchor,
  onClose,
  source,
}: {
  anchor: SelectionAnchor;
  onClose: () => void;
  source?: string;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [savedChars, setSavedChars] = useState<Record<string, "saving" | "saved">>({});
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setEntries(null);
    setSavedChars({});
    // Các chữ Hán duy nhất trong cụm, giữ thứ tự xuất hiện.
    const seen = new Set<string>();
    const chars: string[] = [];
    for (const ch of Array.from(anchor.text)) {
      if (/\p{Script=Han}/u.test(ch) && !seen.has(ch)) {
        seen.add(ch);
        chars.push(ch);
      }
    }
    Promise.all(chars.map((c) => lookupHanziAction(c))).then((results) => {
      if (!active) return;
      const found: Entry[] = [];
      results.forEach((r, i) => {
        if (r) found.push({ char: chars[i], pinyin: r.pinyin, meaning: r.meaning, hskLevel: r.hskLevel });
      });
      setEntries(found);
    });
    return () => {
      active = false;
    };
  }, [anchor.text]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  async function save(e: Entry) {
    if (savedChars[e.char]) return;
    setSavedChars((s) => ({ ...s, [e.char]: "saving" }));
    const res = await saveWordAction({
      hanzi: e.char,
      pinyin: e.pinyin,
      meaning: e.meaning,
      hskLevel: e.hskLevel,
      source,
    });
    if (res.ok) {
      setSavedChars((s) => ({ ...s, [e.char]: "saved" }));
      toast.success(`Đã lưu “${e.char}” vào sổ từ`);
    } else {
      setSavedChars((s) => {
        const next = { ...s };
        delete next[e.char];
        return next;
      });
      toast.error(res.error ?? "Lưu thất bại");
    }
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;
  const W = 300;
  const left = Math.min(Math.max(anchor.x - W / 2, 10), vw - W - 10);
  const placeAbove = anchor.y > vh * 0.58;
  const style: React.CSSProperties = { left, width: W, position: "fixed", zIndex: 60, maxHeight: "70dvh" };
  if (placeAbove) style.bottom = vh - anchor.y + 14;
  else style.top = anchor.y + 16;

  return (
    <div ref={ref} style={style} className="animate-fade-in flex flex-col overflow-hidden rounded-2xl border bg-white shadow-xl">
      <div className="flex items-center justify-between border-b px-3.5 py-2">
        <span className="font-chinese text-sm font-semibold">{anchor.text}</span>
        <button onClick={onClose} aria-label="Đóng" className="rounded-md p-1 text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {entries === null ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Đang tra cứu…</p>
        ) : entries.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Không có chữ nào trong từ điển.</p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => {
              const st = savedChars[e.char];
              return (
                <li key={e.char} className="flex items-start gap-2 rounded-lg border p-2">
                  <span className={cn("font-chinese text-2xl leading-none", toneColor(getTone(e.pinyin)))}>{e.char}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-pinyin text-xs text-muted-foreground">{e.pinyin}</div>
                    <div className="text-xs leading-snug">{e.meaning}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => save(e)}
                    disabled={!!st}
                    aria-label="Lưu vào sổ từ"
                    className={cn(
                      "shrink-0 rounded-md p-1.5 transition-colors",
                      st === "saved" ? "text-emerald-600" : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                    )}
                  >
                    {st === "saving" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : st === "saved" ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
