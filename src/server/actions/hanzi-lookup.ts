"use server";
import { db } from "@/lib/db";

export interface HanziLookupResult {
  character: string;
  pinyin: string;
  meaning: string;
  hskLevel: string;
  examples: unknown;
}

/**
 * Look up a single character in the HanziCharacter dictionary for the reading
 * click-to-lookup popup. Returns null when the character isn't catalogued — the
 * popup still shows the generated pinyin, so this is a progressive enhancement.
 */
export async function lookupHanziAction(character: string): Promise<HanziLookupResult | null> {
  const ch = character?.trim();
  if (!ch) return null;
  try {
    const row = await db.hanziCharacter.findUnique({
      where: { character: ch },
      select: { character: true, pinyin: true, meaning: true, hskLevel: true, examples: true },
    });
    return row ? { ...row, hskLevel: row.hskLevel } : null;
  } catch {
    return null;
  }
}
