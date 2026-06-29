/**
 * Nạp LUYỆN NGHE HSK2 vào lộ trình (Course HSK2 → 35 bài, mỗi bài 1 phần
 * LISTENING đã xuất bản, 2 đoạn/bài, 2 câu hỏi/đoạn). Theo PDF "HSK2 — LUYỆN
 * NGHE (2 ĐOẠN/BÀI)": 35 bài × 2 đoạn = 70 đoạn nghe.
 *
 * - Dữ liệu: prisma/seed-data/listening-roadmap-HSK2.json (workflow trích lời
 *   thoại + bản dịch từ PDF, tự sinh câu hỏi + đối soát đáp án).
 * - audioUrl = "" → người học nghe bằng giọng zh-CN của trình duyệt (Web Speech),
 *   khớp chính sách "không TTS AI" (admin có thể tải MP3 thật sau).
 * - Idempotent: upsert RoadmapSection (lessonId rl-hsk2-<bai>, skill LISTENING).
 *
 * Chạy: npx tsx prisma/load-roadmap-listening-HSK2.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// bai → tiêu đề (Chủ đề tiếng Việt — Tên bài 中文), dùng cho title của phần Nghe.
const TITLE: Record<number, string> = {
  1: "Sở thích & du lịch — 我想去旅游", 2: "Lựa chọn tốt nhất — 去北京旅游最好", 3: "Số lượng ước lượng — 你要几个？多少钱？",
  4: "Thói quen hằng ngày — 我每天六点起床", 5: "Hỏi thăm sức khỏe — 你是不是病了？", 6: "Tâm trạng & cảm giác — 我有点儿累",
  7: "Mô tả & sở hữu — 左边红色的是我的", 8: "Hành động ngắn — 等我一下", 9: "Cảm thán — 这个真漂亮！",
  10: "Giới thiệu & quen biết — 我来介绍一下", 11: "Công việc & giúp đỡ — 他帮我介绍了工作", 12: "Nhấn mạnh thông tin — 我是去年来的", 13: "Thời điểm & hoàn thành — 下班的时候",
  14: "Mua sắm & đề nghị — 买这件衣服吧", 15: "Giá cả & mặc cả — 太贵了，便宜点儿吧", 16: "Lưỡng lự — 我还想再看看",
  17: "Ăn uống & hỏi lý do — 你怎么不吃了？", 18: "Nhân quả — 因为太辣，所以…", 19: "Nhấn mạnh toàn thể — 个个都好吃",
  20: "Khoảng cách — 你家离公司远吗？", 21: "Đi lại & ngữ khí — 我还在等车呢", 22: "Lộ trình & hướng — 从家到公司",
  23: "Suy nghĩ & quyết định — 让我想想再说", 24: "Đề nghị lịch sự — 你帮我一下，好吗？", 25: "Nhắc nhở & tìm đồ — 别找了，在桌子上呢",
  26: "Kế hoạch học tập — 我打算好好复习", 27: "Kết quả công việc — 题太多，我没做完", 28: "Tiếp nhận thông tin — 我听懂了，也看见了", 29: "Thứ tự — 这是第几课？",
  30: "So sánh — 他比我大三岁", 31: "Đánh giá hành động — 你穿得太少了", 32: "Suy đoán — 明天可能会下雨",
  33: "Trạng thái tồn tại — 门开着呢", 34: "Trải nghiệm quá khứ — 你看过那个电影吗？",
  35: "Sự kiện sắp tới & ôn tập — 新年就要到了",
};

type RawQuestion = { type: string; prompt: string; options?: { text: string }[]; correctAnswer: { index?: number; value?: boolean }; explanation?: string };
type RawClip = { dialogueIndex: number; transcript: string; transcriptExplanation: string; questions: RawQuestion[] };
type RawLesson = { bai: number; clips: RawClip[] };

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function buildQuestion(q: RawQuestion, where: string) {
  const prompt = (q.prompt ?? "").trim();
  assert(prompt, `${where}: prompt trống`);
  const explanation = (q.explanation ?? "").trim() || undefined;
  if (q.type === "MCQ") {
    const options = (q.options ?? []).map((o) => ({ text: String(o.text ?? "").trim() }));
    assert(options.length >= 2 && options.every((o) => o.text), `${where}: MCQ thiếu options`);
    const index = q.correctAnswer?.index;
    assert(typeof index === "number" && index >= 0 && index < options.length, `${where}: MCQ index sai (${index})`);
    return { type: "MCQ", prompt, options, correctAnswer: { index }, ...(explanation ? { explanation } : {}) };
  }
  if (q.type === "TRUE_FALSE") {
    const value = q.correctAnswer?.value;
    assert(typeof value === "boolean", `${where}: TRUE_FALSE thiếu value`);
    return { type: "TRUE_FALSE", prompt, correctAnswer: { value }, ...(explanation ? { explanation } : {}) };
  }
  throw new Error(`${where}: type không hỗ trợ (${q.type})`);
}

async function main() {
  const dataPath = path.join(__dirname, "seed-data", "listening-roadmap-HSK2.json");
  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8")) as { lessons: RawLesson[] };
  const byBai = new Map<number, RawClip[]>();
  for (const l of parsed.lessons) byBai.set(l.bai, l.clips);

  // ── Dựng + kiểm tra content từng bài ──
  const contentByBai = new Map<number, Prisma.InputJsonValue>();
  let clipCount = 0;
  let qCount = 0;
  for (let bai = 1; bai <= 35; bai++) {
    const clips = byBai.get(bai);
    assert(clips, `Thiếu dữ liệu Bài ${bai}`);
    assert(clips.length === 2, `Bài ${bai}: ${clips.length} đoạn (cần 2)`);
    const builtClips = clips
      .slice()
      .sort((a, b) => (a.dialogueIndex || 0) - (b.dialogueIndex || 0))
      .map((c, ci) => {
        const transcript = (c.transcript ?? "").trim();
        const transcriptExplanation = (c.transcriptExplanation ?? "").trim();
        assert(transcript, `Bài ${bai} đoạn ${ci + 1}: transcript trống`);
        assert(transcriptExplanation, `Bài ${bai} đoạn ${ci + 1}: bản dịch trống`);
        const questions = (c.questions ?? []).map((q, qi) => buildQuestion(q, `Bài ${bai} đoạn ${ci + 1} câu ${qi + 1}`));
        assert(questions.length >= 1, `Bài ${bai} đoạn ${ci + 1}: cần ít nhất 1 câu hỏi`);
        qCount += questions.length;
        clipCount++;
        return { title: `Đoạn ${ci + 1}`, audioUrl: "", transcript, transcriptExplanation, questions };
      });
    contentByBai.set(bai, { title: TITLE[bai] ?? `Bài ${bai}`, timeLimit: 180, clips: builtClips } as unknown as Prisma.InputJsonValue);
  }
  console.log(`[check] OK — 35 bài, ${clipCount} đoạn, ${qCount} câu hỏi.`);

  const course = await prisma.course.findFirst({ where: { hskLevel: "HSK2" } });
  assert(course, "Không tìm thấy Course HSK2.");

  // ── Upsert phần LISTENING cho 35 bài ──
  let done = 0;
  for (let bai = 1; bai <= 35; bai++) {
    const lessonId = `rl-hsk2-${bai}`;
    const lesson = await prisma.roadmapLesson.findUnique({ where: { id: lessonId }, select: { id: true } });
    assert(lesson, `Không thấy bài ${lessonId} — chạy load-roadmap-vocab-HSK2.ts trước.`);
    const content = contentByBai.get(bai)!;
    await prisma.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId, skill: "LISTENING" } },
      update: { content, order: 5, published: true, title: "" },
      create: { lessonId, skill: "LISTENING", order: 5, content, published: true },
    });
    done++;
  }
  console.log(`[done] ${done} phần LISTENING (đã xuất bản).`);

  // ── Tự kiểm tra lại ──
  const secs = await prisma.roadmapSection.findMany({
    where: { skill: "LISTENING", lesson: { courseId: course.id } },
  });
  const clips = secs.reduce((n, s) => n + (((s.content as any)?.clips?.length) || 0), 0);
  const qs = secs.reduce((n, s) => {
    const cl = (s.content as any)?.clips || [];
    return n + cl.reduce((m: number, c: any) => m + (c.questions?.length || 0), 0);
  }, 0);
  console.log(`[verify] HSK2 LISTENING sections=${secs.length}, clips=${clips}, questions=${qs}, publish=${secs.every((s) => s.published)}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
