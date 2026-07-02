/**
 * Lấp NHANH các ô mỏng của "Luyện kỹ năng" bằng nội dung SUY RA từ kho từ vựng
 * (không cần AI — dùng khi bị giới hạn phiên). Tạo thêm:
 *   - SPEAKING: HSK4/HSK5/HSK6 (mỗi cấp vài bộ đề)
 *   - LISTENING: HSK6 (vài bài)
 * Chất lượng "đủ dùng" (câu ví dụ thật đã thẩm định); có thể thay bằng bản AI sau.
 *
 * Idempotent theo id ổn định (sp-HSKx-d1…, ls-HSK6-d1…). KHÔNG đụng nội dung khác.
 * Chạy: npx tsx prisma/load-skill-gap-fill.ts   (DRY=1 để thử)
 */
import { PrismaClient, Prisma, QuestionType, HSKLevel } from "@prisma/client";
import { deriveSections, type Word } from "./sample-derive";

const prisma = new PrismaClient();
const DRY = process.env.DRY === "1";

function wordsOf(content: unknown): Word[] {
  const c = content as { words?: unknown };
  if (!c || !Array.isArray(c.words)) return [];
  return c.words.map((w) => {
    const o = w as Record<string, unknown>;
    return {
      hanzi: String(o.hanzi ?? "").trim(),
      pinyin: String(o.pinyin ?? "").trim(),
      meaning: String(o.meaning ?? "").trim(),
      examples: Array.isArray(o.examples)
        ? (o.examples as Record<string, unknown>[]).map((e) => ({ hanzi: String(e.hanzi ?? ""), pinyin: String(e.pinyin ?? ""), meaning: String(e.meaning ?? "") }))
        : [],
    };
  }).filter((w) => w.hanzi);
}

// Lấy các bài (lesson) có phần VOCAB của một cấp, kèm topic để dựng nội dung.
async function vocabLessons(level: HSKLevel) {
  const lessons = await prisma.roadmapLesson.findMany({
    where: { course: { hskLevel: level } },
    orderBy: [{ chapterOrder: "asc" }, { order: "asc" }],
    include: { sections: { where: { skill: "VOCAB", published: true } } },
  });
  return lessons
    .map((l) => ({ topic: l.topic, topicZh: l.topicZh, words: wordsOf(l.sections[0]?.content) }))
    .filter((l) => l.words.length >= 3);
}

async function main() {
  let spk = 0;
  let lis = 0;

  // ── SPEAKING: HSK4/HSK5/HSK6 → 5 bộ đề/cấp ──
  for (const level of ["HSK4", "HSK5", "HSK6"] as HSKLevel[]) {
    const lessons = (await vocabLessons(level)).slice(0, 5);
    let k = 0;
    for (const l of lessons) {
      const [sec] = deriveSections(l.words, l.words, { topic: l.topic, topicZh: l.topicZh }, new Set(["SPEAKING"] as any));
      if (!sec) continue;
      k++;
      const c = sec.content as any;
      const id = `sp-${level}-d${k}`;
      const data = {
        title: `Luyện nói — ${l.topic}`, hskLevel: level, order: 60 + k, published: true,
        part1Sentences: c.part1Sentences as Prisma.InputJsonValue,
        part2Passage: c.part2Passage as Prisma.InputJsonValue,
        part3Questions: c.part3Questions as Prisma.InputJsonValue,
      };
      if (!DRY) await prisma.speakingSet.upsert({ where: { id }, update: data, create: { id, ...data } });
      spk++;
    }
    console.log(`[SPEAKING ${level}] +${k}`);
  }

  // ── LISTENING: HSK6 → 5 bài ──
  for (const level of ["HSK6"] as HSKLevel[]) {
    const lessons = (await vocabLessons(level)).slice(0, 5);
    let k = 0;
    for (const l of lessons) {
      const [sec] = deriveSections(l.words, l.words, { topic: l.topic, topicZh: l.topicZh }, new Set(["LISTENING"] as any));
      if (!sec) continue;
      const clip = (sec.content as any).clips?.[0];
      if (!clip || !clip.transcript || !(clip.questions?.length >= 3)) continue;
      k++;
      const id = `ls-${level}-d${k}`;
      const data = {
        title: `Luyện nghe — ${l.topic}`, hskLevel: level, audioUrl: "",
        transcript: clip.transcript as string, transcriptExplanation: (clip.transcriptExplanation as string) ?? null,
        timeLimit: 300, order: 60 + k, published: true,
      };
      if (!DRY) {
        await prisma.listeningTest.upsert({ where: { id }, update: data, create: { id, ...data } });
        let qi = 0;
        for (const q of clip.questions) {
          qi++;
          const qid = `${id}-q${qi}`;
          const qdata = {
            type: q.type as QuestionType, prompt: String(q.prompt), promptPinyin: null,
            options: (q.options ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
            explanation: q.explanation ?? null, order: qi, listeningId: id,
          };
          await prisma.question.upsert({ where: { id: qid }, update: qdata, create: { id: qid, ...qdata } });
        }
      }
      lis++;
    }
    console.log(`[LISTENING ${level}] +${k}`);
  }

  console.log(`\n${DRY ? "[DRY] " : ""}Gap-fill: SPEAKING +${spk}, LISTENING +${lis}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
