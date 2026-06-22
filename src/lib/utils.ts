import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function countChineseChars(text: string): number {
  if (!text) return 0;
  // Fall back to a regex count where Intl.Segmenter is unavailable (old webviews)
  // so this never throws during render and blanks the screen.
  try {
    const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
    let count = 0;
    for (const seg of segmenter.segment(text)) {
      if (/\p{Script=Han}/u.test(seg.segment)) count++;
    }
    return count;
  } catch {
    return (text.match(/\p{Script=Han}/gu) ?? []).length;
  }
}

/**
 * Split a sentence into segments, flagging every occurrence of `word` so the
 * caller can bold it (used to highlight the target word inside example
 * sentences). Plain string match — Chinese has no spaces so substring is exact.
 */
export function markWord(sentence: string, word: string): Array<{ text: string; match: boolean }> {
  if (!word || !sentence.includes(word)) return [{ text: sentence, match: false }];
  const out: Array<{ text: string; match: boolean }> = [];
  let i = 0;
  while (i < sentence.length) {
    const idx = sentence.indexOf(word, i);
    if (idx === -1) {
      out.push({ text: sentence.slice(i), match: false });
      break;
    }
    if (idx > i) out.push({ text: sentence.slice(i, idx), match: false });
    out.push({ text: word, match: true });
    i = idx + word.length;
  }
  return out;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function hskLevelLabel(level: string): string {
  const map: Record<string, string> = {
    HSK1: "HSK 1",
    HSK2: "HSK 2",
    HSK3: "HSK 3",
    HSK4: "HSK 4",
    HSK5: "HSK 5",
    HSK6: "HSK 6",
  };
  return map[level] ?? level;
}

export function toneColor(tone: number): string {
  const colors: Record<number, string> = {
    1: "text-red-500",
    2: "text-green-500",
    3: "text-blue-500",
    4: "text-purple-500",
    0: "text-zinc-400",
  };
  return colors[tone] ?? "text-foreground";
}

export function xpToLevel(xp: number): { level: number; progress: number; next: number } {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000];
  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
    else break;
  }
  const current = thresholds[level - 1] ?? 0;
  const next = thresholds[level] ?? thresholds[thresholds.length - 1];
  const progress = next > current ? Math.round(((xp - current) / (next - current)) * 100) : 100;
  return { level, progress, next };
}

/** Solid colored badge classes per HSK level (for level chips on cards). */
export function hskBadgeClass(level: string): string {
  const map: Record<string, string> = {
    HSK1: "bg-emerald-500 text-white",
    HSK2: "bg-teal-500 text-white",
    HSK3: "bg-sky-500 text-white",
    HSK4: "bg-violet-500 text-white",
    HSK5: "bg-orange-500 text-white",
    HSK6: "bg-rose-600 text-white",
  };
  return map[level] ?? "bg-zinc-500 text-white";
}

// Decorative cover art for cards (we have no uploaded images): a soft gradient
// plus a large translucent Hán character, picked deterministically from a seed.
const COVER_GRADIENTS = [
  "from-rose-400 to-orange-300",
  "from-emerald-400 to-teal-300",
  "from-sky-400 to-indigo-300",
  "from-violet-400 to-fuchsia-300",
  "from-amber-400 to-rose-300",
  "from-teal-400 to-cyan-300",
  "from-indigo-400 to-purple-300",
  "from-red-400 to-amber-300",
];
const COVER_CHARS = ["学", "读", "听", "写", "说", "字", "文", "语", "词", "句", "书", "课", "汉", "中", "习", "好"];

function seedHash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}
export function coverGradient(seed: string): string {
  return COVER_GRADIENTS[seedHash(seed) % COVER_GRADIENTS.length];
}
export function coverChar(seed: string): string {
  return COVER_CHARS[seedHash(seed + "·") % COVER_CHARS.length];
}
