/**
 * Bổ sung CHỮ HÁN (Luyện kỹ năng → Chữ Hán) bằng cách rút các TỪ ĐƠN ÂM (1 chữ)
 * từ kho từ vựng Lộ trình đã có trong DB (hanzi/pinyin/nghĩa + câu ví dụ đã thẩm
 * định). KHÔNG bịa: mọi chữ đều là từ thật. Bỏ chữ đã có sẵn (HanziCharacter.character
 * là khoá duy nhất → không ghi đè bộ chữ đã biên soạn).
 *
 * Ghi prisma/seed-data/hanzi-extra.json (để db:seed đồng bộ) + upsert prod.
 * Chạy: npx tsx prisma/load-hanzi-extra.ts   (DRY=1 để thử)
 */
import { PrismaClient, Prisma, HSKLevel } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DRY = process.env.DRY === "1";
const PER_LEVEL_CAP = 45;
const LEVELS: HSKLevel[] = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"] as HSKLevel[];

function toneOf(char: string): number {
  const p = (pinyin(char, { toneType: "num", type: "array" })[0] as string) ?? "";
  const m = p.match(/([0-5])/);
  if (!m) return 0;
  const n = Number(m[1]);
  return n === 5 ? 0 : n;
}
const isSingle = (s: string) => [...(s ?? "").normalize("NFC")].length === 1;

async function main() {
  const existing = new Set((await prisma.hanziCharacter.findMany({ select: { character: true } })).map((h) => h.character));
  const before = existing.size;

  const added: any[] = [];
  const seen = new Set<string>(existing);

  for (const level of LEVELS) {
    const sections = await prisma.roadmapSection.findMany({
      where: { skill: "VOCAB", published: true, lesson: { course: { hskLevel: level } } },
      select: { content: true },
    });
    let n = 0;
    for (const sec of sections) {
      const words = (sec.content as any)?.words ?? [];
      for (const w of words) {
        if (n >= PER_LEVEL_CAP) break;
        const hz = String(w.hanzi ?? "").trim();
        if (!isSingle(hz) || seen.has(hz)) continue;
        const meaning = String(w.meaning ?? "").trim();
        if (!meaning) continue;
        seen.add(hz);
        const examples = (Array.isArray(w.examples) ? w.examples : [])
          .slice(0, 2)
          .map((e: any) => ({ sentence: String(e.hanzi ?? "").trim(), pinyin: String(e.pinyin ?? "").trim(), meaning: String(e.meaning ?? "").trim() }))
          .filter((e: any) => e.sentence);
        added.push({
          id: `hz-${level}-x${n + 1}`,
          character: hz,
          pinyin: String(w.pinyin ?? "").trim() || pinyin(hz, { toneType: "symbol" }),
          tone: toneOf(hz),
          meaning,
          hskLevel: level,
          strokeCount: 0, // hanzi-writer tự tải nét; 0 => ẩn "x nét"
          examples,
        });
        n++;
      }
      if (n >= PER_LEVEL_CAP) break;
    }
    console.log(`[${level}] thêm ${n} chữ`);
  }

  fs.writeFileSync(path.join(__dirname, "seed-data", "hanzi-extra.json"), JSON.stringify({ kind: "hanzi", characters: added }, null, 2), "utf8");
  console.log(`[build] tổng thêm ${added.length} chữ (đã có ${before}).`);

  if (DRY) {
    console.log("[DRY] chỉ ghi file.");
    return;
  }
  for (const c of added) {
    const data = {
      pinyin: c.pinyin, tone: c.tone, meaning: c.meaning, hskLevel: c.hskLevel as HSKLevel,
      strokeCount: c.strokeCount, strokeOrder: { strokes: c.strokeCount } as Prisma.InputJsonValue,
      examples: c.examples as Prisma.InputJsonValue, published: true,
    };
    await prisma.hanziCharacter.upsert({
      where: { character: c.character },
      update: {}, // KHÔNG đụng chữ đã có (chỉ tạo mới) — an toàn
      // Không set id thủ công: để @default(cuid()) tự sinh, tránh trùng id giữa
      // các lần chạy (id vị trí `hz-<level>-x<n>` không ổn định khi tập chữ đổi).
      create: { character: c.character, ...data },
    });
  }
  const after = await prisma.hanziCharacter.count();
  console.log(`[done] Chữ Hán: ${before} → ${after} (+${after - before}).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
