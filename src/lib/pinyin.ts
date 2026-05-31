import { pinyin } from "pinyin-pro";

export function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

export function toPinyinArray(text: string): Array<{ char: string; pinyin: string }> {
  const result: Array<{ char: string; pinyin: string }> = [];
  const segmenter = new Intl.Segmenter("zh", { granularity: "grapheme" });

  for (const { segment } of segmenter.segment(text)) {
    const p = /\p{Script=Han}/u.test(segment)
      ? pinyin(segment, { toneType: "symbol" })
      : segment;
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
