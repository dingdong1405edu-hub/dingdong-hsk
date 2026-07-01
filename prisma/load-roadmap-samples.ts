/**
 * Nạp NỘI DUNG BÀI MẪU cho MỌI phần (skill) còn trống của Lộ trình, SUY RA từ
 * TỪ VỰNG đã có của từng bài (không gọi AI → không bịa). Lấp các ô ❌ trong ma trận
 * kỹ năng để mọi cấp HSK có đủ 7 kỹ năng chơi được ngay — nhãn "(Bài mẫu)".
 *
 * Chạy được cho MỌI cấp có sẵn phần Từ vựng (HSK1/2/3/5 ngay bây giờ; HSK4/HSK6 sau
 * khi đã nạp Từ vựng bằng load-roadmap-samples-vocab-HSK46.ts).
 *
 * An toàn tuyệt đối với nội dung THẬT:
 *  - Chỉ TẠO section cho skill CHƯA có; KHÔNG bao giờ đụng section thật (published,
 *    không có cờ sample).
 *  - Mỗi section mẫu gắn `content.sample = true` + `RoadmapSection.title = "Bài mẫu"`.
 *  - Mặc định: idempotent, chỉ tạo nếu thiếu (chạy lại không đổi).
 *  - FORCE=1: làm mới lại CHÍNH các section mẫu (sample===true), vẫn không đụng thật.
 *  - DRY=1: chỉ kiểm tra + thống kê, KHÔNG ghi DB.
 *
 * Chạy:  npx tsx prisma/load-roadmap-samples.ts            (ghi, tạo nếu thiếu)
 *        DRY=1 npx tsx prisma/load-roadmap-samples.ts       (thử, không ghi)
 *        FORCE=1 npx tsx prisma/load-roadmap-samples.ts     (làm mới section mẫu)
 */
import { PrismaClient, Prisma, Skill } from "@prisma/client";
import { validateSectionContent } from "../src/lib/roadmap-content";
import {
  deriveSections,
  assertSolvable,
  type Word,
  type DerivableSkill,
} from "./sample-derive";

const prisma = new PrismaClient();
const DRY = process.env.DRY === "1";
const FORCE = process.env.FORCE === "1";
const ONLY_LEVEL = process.env.LEVEL; // vd LEVEL=HSK3 để chạy 1 cấp

const DERIVABLE: DerivableSkill[] = ["GRAMMAR", "HANZI", "READING", "LISTENING", "WRITING", "SPEAKING"];

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function wordsOf(content: unknown): Word[] {
  const c = content as { words?: unknown };
  if (!c || !Array.isArray(c.words)) return [];
  return c.words
    .map((w) => w as Record<string, unknown>)
    .filter((w) => typeof w.hanzi === "string" && (w.hanzi as string).trim())
    .map((w) => ({
      hanzi: String(w.hanzi).trim(),
      pinyin: String(w.pinyin ?? "").trim(),
      meaning: String(w.meaning ?? "").trim(),
      examples: Array.isArray(w.examples)
        ? (w.examples as Record<string, unknown>[]).map((e) => ({
            hanzi: String(e.hanzi ?? "").trim(),
            pinyin: String(e.pinyin ?? "").trim(),
            meaning: String(e.meaning ?? "").trim(),
          }))
        : [],
    }));
}

const isSample = (content: unknown): boolean =>
  !!content && typeof content === "object" && (content as { sample?: unknown }).sample === true;

async function main() {
  const courses = await prisma.course.findMany({
    where: ONLY_LEVEL ? { hskLevel: ONLY_LEVEL as any } : undefined,
    orderBy: { order: "asc" },
  });
  assert(courses.length, "Không thấy Course nào.");

  const stats = {
    created: 0,
    refreshed: 0,
    skippedReal: 0,
    skippedExistingSample: 0,
    lessonsNoVocab: 0,
    couldNotDerive: [] as string[],
    perLevel: {} as Record<string, Record<string, number>>,
  };
  const previews: string[] = [];

  for (const course of courses) {
    const lessons = await prisma.roadmapLesson.findMany({
      where: { courseId: course.id },
      orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
      include: { sections: true },
    });

    // Pool distractor toàn cấp (mọi từ trong các phần Từ vựng đã có).
    const pool: Word[] = [];
    for (const l of lessons) {
      const v = l.sections.find((s) => s.skill === "VOCAB" && s.published);
      if (v) pool.push(...wordsOf(v.content));
    }
    const lvlStat: Record<string, number> = {};
    stats.perLevel[course.hskLevel] = lvlStat;

    for (const lesson of lessons) {
      const vocab = lesson.sections.find((s) => s.skill === "VOCAB" && s.published);
      const words = vocab ? wordsOf(vocab.content) : [];
      if (words.length === 0) {
        stats.lessonsNoVocab++;
        continue;
      }

      // Skill nào cần dựng cho bài này?
      const toBuild = new Set<DerivableSkill>();
      for (const skill of DERIVABLE) {
        const existing = lesson.sections.find((s) => s.skill === (skill as Skill));
        if (!existing) {
          toBuild.add(skill);
        } else if (isSample(existing.content) && FORCE) {
          toBuild.add(skill); // làm mới section mẫu của chính mình
        } else if (isSample(existing.content)) {
          stats.skippedExistingSample++;
        } else {
          stats.skippedReal++; // nội dung THẬT → không đụng
        }
      }
      if (toBuild.size === 0) continue;

      const derived = deriveSections(words, pool.length ? pool : words, { topic: lesson.topic, topicZh: lesson.topicZh }, toBuild);
      const builtSkills = new Set(derived.map((d) => d.skill));
      for (const s of toBuild) if (!builtSkills.has(s)) stats.couldNotDerive.push(`${course.hskLevel} bài ${lesson.order} · ${s}`);

      for (const sec of derived) {
        // 1) Hợp lệ theo validator của app (đảm bảo chơi được) — dùng bản sao vì
        //    validate strict sẽ lược cờ sample; ta LƯU bản gốc (còn cờ sample).
        const v = validateSectionContent(sec.skill, sec.content);
        assert(v.ok, `${course.hskLevel} bài ${lesson.order} · ${sec.skill}: validate lỗi — ${v.ok ? "" : v.error}`);
        // 2) Giải được theo đúng cách UI chấm (đúng đáp án theo cấu trúc).
        assertSolvable(sec);

        if (previews.length < 3 && sec.skill === "READING") {
          previews.push(
            `${course.hskLevel} bài ${lesson.order} READING: passage="${String((sec.content as any).passages[0].passage).slice(0, 40)}…" q=${(sec.content as any).passages[0].questions.length}`
          );
        }

        if (DRY) {
          stats.created++;
          lvlStat[sec.skill] = (lvlStat[sec.skill] ?? 0) + 1;
          continue;
        }

        const content = sec.content as unknown as Prisma.InputJsonValue;
        const existed = lesson.sections.find((s) => s.skill === (sec.skill as Skill));
        await prisma.roadmapSection.upsert({
          where: { lessonId_skill: { lessonId: lesson.id, skill: sec.skill as Skill } },
          update: { content, order: sec.order, published: true, title: "Bài mẫu" },
          create: { lessonId: lesson.id, skill: sec.skill as Skill, order: sec.order, content, published: true, title: "Bài mẫu" },
        });
        if (existed) stats.refreshed++;
        else stats.created++;
        lvlStat[sec.skill] = (lvlStat[sec.skill] ?? 0) + 1;
      }
    }
  }

  console.log(`\n${DRY ? "[DRY] " : ""}${FORCE ? "[FORCE] " : ""}Kết quả nạp bài mẫu:`);
  console.log(`  tạo mới     : ${stats.created}`);
  console.log(`  làm mới     : ${stats.refreshed}`);
  console.log(`  bỏ (thật)   : ${stats.skippedReal}`);
  console.log(`  bỏ (mẫu cũ) : ${stats.skippedExistingSample}`);
  console.log(`  bài ko vocab: ${stats.lessonsNoVocab}`);
  for (const [lvl, m] of Object.entries(stats.perLevel)) {
    const parts = DERIVABLE.map((s) => `${s}=${m[s] ?? 0}`).join(" ");
    console.log(`  [${lvl}] ${parts}`);
  }
  if (stats.couldNotDerive.length) {
    console.warn(`  ⚠️ không dựng được (${stats.couldNotDerive.length}): ${stats.couldNotDerive.slice(0, 20).join(", ")}${stats.couldNotDerive.length > 20 ? "…" : ""}`);
  }
  if (previews.length) {
    console.log("  ví dụ:");
    for (const p of previews) console.log(`    - ${p}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
