"use server";
import type { HSKLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { generateHanziLookup, isGradingConfigured } from "@/lib/groq";
import { getTone } from "@/lib/pinyin";

export interface HanziLookupResult {
  character: string;
  pinyin: string;
  meaning: string;
  hskLevel: string;
  examples: unknown;
}

/**
 * Look up a single character for the reading click-to-lookup popup.
 *
 * 1. Prefer the curated/seeded HanziCharacter dictionary.
 * 2. On a miss, generate pinyin + Vietnamese meaning + examples with Groq and
 *    cache the row (published: false → stays out of the curated Hanzi module,
 *    which filters `published: true`). Subsequent lookups are instant and the
 *    dictionary fills itself with exactly the characters learners encounter.
 *
 * Returns null when the character isn't catalogued and AI is unavailable — the
 * popup still shows the client-computed pinyin, so this stays a progressive
 * enhancement.
 */
export async function lookupHanziAction(character: string): Promise<HanziLookupResult | null> {
  const ch = character?.trim();
  if (!ch) return null;

  // 1) Curated/cached dictionary.
  try {
    const row = await db.hanziCharacter.findUnique({
      where: { character: ch },
      select: { character: true, pinyin: true, meaning: true, hskLevel: true, examples: true },
    });
    if (row) return { ...row, hskLevel: row.hskLevel };
  } catch {
    return null;
  }

  // 2) AI fallback + cache (only for actual Han characters, to avoid wasting
  // calls on punctuation / Latin letters that slip through).
  if (!isGradingConfigured()) return null;
  if (!/\p{Script=Han}/u.test(ch)) return null;

  try {
    const gen = await generateHanziLookup(ch);
    if (!gen) return null;
    try {
      await db.hanziCharacter.upsert({
        where: { character: ch },
        update: {}, // đã được tạo (vd đua song song) → giữ nguyên bản đã có
        create: {
          character: ch,
          pinyin: gen.pinyin,
          tone: getTone(gen.pinyin),
          meaning: gen.meaning,
          hskLevel: gen.hskLevel as HSKLevel,
          strokeCount: 0,
          strokeOrder: {},
          examples: gen.examples,
          published: false, // ẩn khỏi module luyện chữ Hán (chỉ phục vụ tra cứu)
        },
      });
    } catch {
      /* ghi cache lỗi (vd đua tạo trùng) — vẫn trả kết quả đã sinh */
    }
    return {
      character: ch,
      pinyin: gen.pinyin,
      meaning: gen.meaning,
      hskLevel: gen.hskLevel,
      examples: gen.examples,
    };
  } catch {
    return null;
  }
}
