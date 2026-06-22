import { pinyin } from "pinyin-pro";

export function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

/**
 * Split text into per-grapheme {char, pinyin} segments for ruby rendering.
 * Robust to environments without `Intl.Segmenter` (falls back to code-point
 * splitting) and never throws on a bad character — a single failed lookup just
 * renders the raw character so the passage is never blanked.
 */
export function toPinyinArray(text: string): Array<{ char: string; pinyin: string }> {
  if (!text) return [];
  const result: Array<{ char: string; pinyin: string }> = [];

  let graphemes: string[];
  try {
    const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });
    graphemes = Array.from(segmenter.segment(text), (s) => s.segment);
  } catch {
    // Older browsers / embedded webviews without Intl.Segmenter.
    graphemes = Array.from(text);
  }

  for (const segment of graphemes) {
    let p = segment;
    if (/\p{Script=Han}/u.test(segment)) {
      try {
        p = pinyin(segment, { toneType: "symbol" });
      } catch {
        p = segment;
      }
    }
    result.push({ char: segment, pinyin: p });
  }
  return result;
}

export function getTone(pinyinStr: string): number {
  if (/[āēīōūǖ]/.test(pinyinStr)) return 1;
  if (/[áéíóúǘ]/.test(pinyinStr)) return 2;
  if (/[ǎěǐǒǔǚ]/.test(pinyinStr)) return 3;
  if (/[àèìòùǜ]/.test(pinyinStr)) return 4;
  return 0;
}
