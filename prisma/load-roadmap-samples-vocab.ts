/**
 * Nạp TỪ VỰNG BÀI MẪU cho các bài lộ trình CHƯA có phần Từ vựng (HSK4, HSK6, và
 * HSK1 bài "Gia đình"). Nguồn: prisma/seed-data/vocab-roadmap-samples-HSK46.json
 * (do workflow gen-hsk46-vocab sinh + người bản ngữ thẩm định).
 *
 * Chuẩn hoá CHẮC CHẮN ĐÚNG bằng code (không tin pinyin của AI):
 *  - pinyin của TỪ và của CÂU ví dụ đều SINH LẠI bằng pinyin-pro.
 *  - BẮT BUỘC câu ví dụ chứa nguyên văn từ khoá → từ nào không đạt sẽ bị loại.
 * Sau đó chạy lại `load-roadmap-samples.ts` để suy ra 6 kỹ năng còn lại.
 *
 * An toàn: chỉ TẠO phần VOCAB nếu bài CHƯA có (không đụng nội dung thật). Đánh dấu
 * content.sample=true + RoadmapSection.title="Bài mẫu". FORCE=1 để làm mới bản mẫu.
 *
 * Chạy: npx tsx prisma/load-roadmap-samples-vocab.ts
 */
import { PrismaClient, Prisma, Skill, HSKLevel } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import { validateSectionContent } from "../src/lib/roadmap-content";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const DRY = process.env.DRY === "1";
const FORCE = process.env.FORCE === "1";

const wordPinyin = (s: string) => pinyin(s, { toneType: "symbol", separator: "" });
const sentPinyin = (s: string) => pinyin(s, { toneType: "symbol", separator: " " });

interface RawWord {
  hanzi: string;
  meaning: string;
  exampleHanzi: string;
  exampleMeaning: string;
}
interface RawLesson {
  level: string;
  order: number;
  topic: string;
  topicZh: string;
  words: RawWord[];
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const isSample = (content: unknown): boolean =>
  !!content && typeof content === "object" && (content as { sample?: unknown }).sample === true;

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "vocab-roadmap-samples-HSK46.json");
  assert(fs.existsSync(dataPath), `Thiếu file dữ liệu: ${dataPath} (chạy workflow gen-hsk46-vocab trước)`);
  const raw = JSON.parse(fs.readFileSync(dataPath, "utf8")) as RawLesson[];
  assert(Array.isArray(raw) && raw.length > 0, "File dữ liệu rỗng.");

  let created = 0;
  let refreshed = 0;
  let skipped = 0;
  let droppedWords = 0;
  const perLevel: Record<string, number> = {};

  for (const l of raw) {
    // Chuẩn hoá + lọc từ.
    const words = (l.words ?? [])
      .map((w) => ({
        hanzi: String(w.hanzi ?? "").trim(),
        meaning: String(w.meaning ?? "").trim(),
        exampleHanzi: String(w.exampleHanzi ?? "").trim(),
        exampleMeaning: String(w.exampleMeaning ?? "").trim(),
      }))
      .filter((w) => {
        const keep = w.hanzi && w.meaning && w.exampleHanzi.includes(w.hanzi);
        if (!keep) droppedWords++;
        return keep;
      })
      // bỏ trùng từ trong cùng bài
      .filter((w, i, arr) => arr.findIndex((x) => x.hanzi === w.hanzi) === i)
      .map((w) => ({
        hanzi: w.hanzi,
        pinyin: wordPinyin(w.hanzi),
        meaning: w.meaning,
        audioUrl: null as string | null,
        examples: [{ hanzi: w.exampleHanzi, pinyin: sentPinyin(w.exampleHanzi), meaning: w.exampleMeaning }],
      }));

    if (words.length === 0) {
      console.warn(`[skip] ${l.level} bài ${l.order} (${l.topicZh}): không còn từ hợp lệ`);
      continue;
    }

    const content = {
      title: `(Bài mẫu) Từ vựng — ${l.topicZh}`,
      words,
      sample: true,
    };
    const v = validateSectionContent("VOCAB", content);
    assert(v.ok, `${l.level} bài ${l.order}: VOCAB validate lỗi — ${v.ok ? "" : v.error}`);

    // Tra bài theo (cấp, order) — bền với id cuid (HSK1) lẫn rl-hsk*-N.
    const lesson = await prisma.roadmapLesson.findFirst({
      where: { course: { hskLevel: l.level as HSKLevel }, order: l.order },
      include: { sections: { where: { skill: "VOCAB" } } },
    });
    assert(lesson, `Không thấy bài ${l.level} order=${l.order}`);

    const existing = lesson.sections[0];
    if (existing && !isSample(existing.content)) {
      skipped++; // đã có Từ vựng thật → không đụng
      continue;
    }
    if (existing && isSample(existing.content) && !FORCE) {
      skipped++;
      continue;
    }

    perLevel[l.level] = (perLevel[l.level] ?? 0) + 1;
    if (DRY) {
      console.log(`[DRY] ${l.level} bài ${l.order} (${l.topicZh}): ${words.length} từ`);
      if (existing) refreshed++; else created++;
      continue;
    }

    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId: lesson.id, skill: "VOCAB" as Skill } },
      update: { content: content as unknown as Prisma.InputJsonValue, order: 1, published: true, title: "Bài mẫu" },
      create: { lessonId: lesson.id, skill: "VOCAB" as Skill, order: 1, content: content as unknown as Prisma.InputJsonValue, published: true, title: "Bài mẫu" },
    });
    if (existing) refreshed++; else created++;
  }

  console.log(`\n${DRY ? "[DRY] " : ""}Từ vựng bài mẫu: tạo=${created} làm mới=${refreshed} bỏ=${skipped} · loại ${droppedWords} từ không đạt`);
  console.log(`  theo cấp: ${Object.entries(perLevel).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
