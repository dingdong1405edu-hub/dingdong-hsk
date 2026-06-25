"use server";
// Ghi tiến độ + chấm điểm khi học viên CHƠI một phần kỹ năng trong lộ trình.
// Tiến độ ghi vào RoadmapProgress.skillsDone (KHÔNG đụng bảng kỹ năng của phần
// Luyện kỹ năng). Lộ trình KHÔNG tiêu tim — gói lộ trình mở khoá theo cấp, tim chỉ
// giới hạn ở "Gói Tự do".
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Prisma, Skill } from "@prisma/client";
import { getEntitlements, isRoadmapLessonLocked } from "@/lib/entitlements";
import { gradeWriting, gradeSpeaking, isGradingConfigured } from "@/lib/groq";
import {
  readingContentSchema,
  listeningContentSchema,
  writingContentSchema,
  roadmapQuestionId,
  type RoadmapQuestion,
} from "@/lib/roadmap-content";
import type { SkillKey } from "@/lib/roadmap";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

const SKILL_KEYS: SkillKey[] = ["VOCAB", "GRAMMAR", "HANZI", "READING", "LISTENING", "WRITING", "SPEAKING"];

function normalize(s: string): string {
  return s.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

/** Chấm danh sách câu hỏi (MCQ / Đúng-Sai / Điền từ) — dùng cho Đọc & Nghe. */
function gradeQuestions(
  questions: RoadmapQuestion[],
  answers: Record<string, unknown>
): { score: number; details: Record<string, boolean> } {
  let correct = 0;
  const details: Record<string, boolean> = {};
  questions.forEach((q, i) => {
    const id = roadmapQuestionId(i);
    const a = answers[id];
    const ca = q.correctAnswer;
    let ok = false;
    if (q.type === "MCQ") ok = typeof ca.index === "number" && a === ca.index;
    else if (q.type === "TRUE_FALSE") ok = typeof ca.value === "boolean" && a === ca.value;
    else {
      const accepted = [ca.text, ...(ca.accepted ?? [])]
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .map(normalize);
      ok = typeof a === "string" && accepted.includes(normalize(a));
    }
    if (ok) correct++;
    details[id] = ok;
  });
  const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
  return { score, details };
}

interface RecordResult {
  completed: boolean;
  xpEarned: number;
  skillsDone: string[];
}

/**
 * Ghi một phần kỹ năng là ĐÃ HOÀN THÀNH cho bài lộ trình. Cộng `xpReward` của bài
 * MỘT LẦN khi bài chuyển sang hoàn thành đủ các phần ĐANG HIỆN.
 */
async function recordSkillDone(
  userId: string,
  role: string | undefined,
  lessonId: string,
  skill: SkillKey,
  opts: { score?: number | null; durationSec?: number; rawAnswer?: Prisma.InputJsonValue } = {}
): Promise<RecordResult | { error: string }> {
  const lesson = await db.roadmapLesson.findUnique({
    where: { id: lessonId },
    include: {
      course: { select: { hskLevel: true, id: true } },
      sections: { where: { published: true }, select: { skill: true } },
    },
  });
  if (!lesson) return { error: "Không tìm thấy bài." };

  // Chặn theo gói: free chỉ mở FREE_ROADMAP_LESSONS bài đầu mỗi cấp.
  const ent = await getEntitlements(userId, role);
  const lessonIndex = await db.roadmapLesson.count({
    where: { courseId: lesson.course.id, order: { lt: lesson.order } },
  });
  if (isRoadmapLessonLocked(ent, lesson.course.hskLevel, lessonIndex)) {
    return { error: "Bài học này đang khoá — cần mở khoá lộ trình." };
  }

  const publishedSkills = lesson.sections.map((s) => s.skill as string);

  // Tất cả trong MỘT transaction tương tác: đọc tiến độ, gộp skillsDone, và CỘNG XP
  // một-lần-duy-nhất bằng updateMany có điều kiện (xpEarned: 0) — tránh đua khi
  // double-tap / nhiều tab cùng hoàn thành bài (sẽ cộng XP nhiều lần).
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.roadmapProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { skillsDone: true, completed: true, xpEarned: true },
    });
    const prevDone: string[] = Array.isArray(existing?.skillsDone)
      ? (existing!.skillsDone as unknown[]).filter((x): x is string => typeof x === "string")
      : [];
    const merged = Array.from(new Set([...prevDone, skill]));
    const completedNow =
      publishedSkills.length > 0 && publishedSkills.every((s) => merged.includes(s));
    const justCompleted = completedNow && !(existing?.completed ?? false);

    await tx.roadmapProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      update: {
        skillsDone: merged,
        completed: completedNow,
        ...(opts.score != null ? { score: opts.score } : {}),
        ...(justCompleted ? { completedAt: new Date() } : {}),
      },
      create: {
        userId,
        lessonId,
        skillsDone: merged,
        completed: completedNow,
        score: opts.score ?? null,
        xpEarned: 0,
        completedAt: completedNow ? new Date() : null,
      },
    });

    // XP một lần: chỉ một lời gọi lật được xpEarned 0 → xpReward (count === 1).
    let xpEarned = 0;
    if (completedNow && lesson.xpReward > 0) {
      const claim = await tx.roadmapProgress.updateMany({
        where: { userId, lessonId, xpEarned: 0 },
        data: { xpEarned: lesson.xpReward },
      });
      if (claim.count === 1) xpEarned = lesson.xpReward;
    }

    await tx.attempt.create({
      data: {
        userId,
        skill: skill as Skill,
        refId: lessonId,
        rawAnswer: opts.rawAnswer ?? {},
        score: opts.score ?? null,
        durationSec: opts.durationSec,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date(), ...(xpEarned ? { xp: { increment: xpEarned } } : {}) },
    });

    return { completed: completedNow, xpEarned, skillsDone: merged };
  });

  const slug = lesson.course.hskLevel.toLowerCase();
  revalidatePath(`/roadmap/${slug}`);
  revalidatePath("/roadmap");
  revalidatePath("/dashboard");

  return result;
}

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: (session.user as { role?: string }).role };
}

// ───────────── Hoàn thành phần chấm phía client (Từ vựng / Ngữ pháp / Chữ Hán / Nói) ─────────────

export async function completeRoadmapSectionAction(input: {
  lessonId: string;
  skill: SkillKey;
  correct?: number;
  total?: number;
  score?: number;
  durationSec?: number;
}): Promise<Ok<RecordResult> | Err> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!SKILL_KEYS.includes(input.skill)) return { ok: false, error: "Kỹ năng không hợp lệ." };

  let score = input.score;
  if (score == null && typeof input.correct === "number" && typeof input.total === "number" && input.total > 0) {
    score = Math.round((Math.min(input.correct, input.total) / input.total) * 100);
  }

  const res = await recordSkillDone(user.id, user.role, input.lessonId, input.skill, {
    score: score ?? null,
    durationSec: input.durationSec,
    rawAnswer:
      input.correct != null && input.total != null ? { correct: input.correct, total: input.total } : {},
  });
  if ("error" in res) return { ok: false, error: res.error };
  return { ok: true, ...res };
}

// ───────────── Đọc hiểu — chấm từ content rồi ghi hoàn thành ─────────────

async function loadSection(sectionId: string, skill: Skill) {
  const section = await db.roadmapSection.findUnique({
    where: { id: sectionId },
    select: { id: true, skill: true, lessonId: true, content: true },
  });
  if (!section || section.skill !== skill) return null;
  return section;
}

export async function submitRoadmapReadingAction(input: {
  sectionId: string;
  answers: Record<string, unknown>;
  durationSec?: number;
}): Promise<Ok<{ result: { score: number; details: Record<string, boolean> } }> | Err> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  const section = await loadSection(input.sectionId, Skill.READING);
  if (!section) return { ok: false, error: "Không tìm thấy nội dung." };
  const parsed = readingContentSchema.safeParse(section.content);
  if (!parsed.success) return { ok: false, error: "Nội dung đọc hiểu không hợp lệ." };

  const result = gradeQuestions(parsed.data.questions, input.answers);
  const rec = await recordSkillDone(user.id, user.role, section.lessonId, "READING", {
    score: result.score,
    durationSec: input.durationSec,
    rawAnswer: input.answers as Prisma.InputJsonValue,
  });
  if ("error" in rec) return { ok: false, error: rec.error };
  return { ok: true, result };
}

// ───────────── Nghe hiểu ─────────────

export async function submitRoadmapListeningAction(input: {
  sectionId: string;
  answers: Record<string, unknown>;
  durationSec?: number;
}): Promise<Ok<{ result: { score: number; details: Record<string, boolean> } }> | Err> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  const section = await loadSection(input.sectionId, Skill.LISTENING);
  if (!section) return { ok: false, error: "Không tìm thấy nội dung." };
  const parsed = listeningContentSchema.safeParse(section.content);
  if (!parsed.success) return { ok: false, error: "Nội dung nghe hiểu không hợp lệ." };

  const result = gradeQuestions(parsed.data.questions, input.answers);
  const rec = await recordSkillDone(user.id, user.role, section.lessonId, "LISTENING", {
    score: result.score,
    durationSec: input.durationSec,
    rawAnswer: input.answers as Prisma.InputJsonValue,
  });
  if ("error" in rec) return { ok: false, error: rec.error };
  return { ok: true, result };
}

// ───────────── Viết luận — chấm bằng AI rồi ghi hoàn thành ─────────────

export async function gradeRoadmapWritingAction(input: {
  sectionId: string;
  submission: string;
  durationSec?: number;
}): Promise<Ok<{ result: unknown }> | Err> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!isGradingConfigured()) return { ok: false, error: "Chưa cấu hình chấm AI (GROQ_API_KEY)." };

  const section = await db.roadmapSection.findUnique({
    where: { id: input.sectionId },
    select: { skill: true, lessonId: true, content: true, lesson: { select: { course: { select: { hskLevel: true } } } } },
  });
  if (!section || section.skill !== Skill.WRITING) return { ok: false, error: "Không tìm thấy nội dung." };
  const parsed = writingContentSchema.safeParse(section.content);
  if (!parsed.success) return { ok: false, error: "Nội dung viết không hợp lệ." };

  try {
    const result = await gradeWriting({
      submission: input.submission,
      hskLevel: section.lesson.course.hskLevel,
      taskPrompt: parsed.data.prompt,
      minChars: parsed.data.minChars,
      outline: parsed.data.outline ?? null,
    });
    const rec = await recordSkillDone(user.id, user.role, section.lessonId, "WRITING", {
      score: result.score,
      durationSec: input.durationSec,
      rawAnswer: { submission: input.submission } as Prisma.InputJsonValue,
    });
    if ("error" in rec) return { ok: false, error: rec.error };
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi chấm bài." };
  }
}

// ───────────── Nói (HSKK) — chấm từng đoạn ghi âm (không tự đánh dấu hoàn thành) ─────────────

export async function gradeRoadmapSpeakingAction(input: {
  sectionId: string;
  transcript: string;
  referenceText: string | null;
  part: "repeat" | "read" | "answer";
  question: string | null;
  index: number;
  durationSec?: number;
}): Promise<Ok<{ result: unknown }> | Err> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Unauthorized" };
  if (!isGradingConfigured()) return { ok: false, error: "Chưa cấu hình chấm AI (GROQ_API_KEY)." };

  const section = await db.roadmapSection.findUnique({
    where: { id: input.sectionId },
    select: { skill: true, lessonId: true, lesson: { select: { course: { select: { hskLevel: true } } } } },
  });
  if (!section || section.skill !== Skill.SPEAKING) return { ok: false, error: "Không tìm thấy nội dung." };

  try {
    const result = await gradeSpeaking({
      transcript: input.transcript,
      referenceText: input.referenceText,
      part: input.part,
      question: input.question,
      hskLevel: section.lesson.course.hskLevel,
    });
    await db.attempt.create({
      data: {
        userId: user.id,
        skill: Skill.SPEAKING,
        refId: section.lessonId,
        rawAnswer: {
          transcript: input.transcript,
          part: input.part,
          index: input.index,
          referenceText: input.referenceText,
          question: input.question,
        } as Prisma.InputJsonValue,
        score: result.score,
        durationSec: input.durationSec,
      },
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi chấm điểm." };
  }
}
