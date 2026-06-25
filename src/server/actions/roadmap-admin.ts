"use server";
// CRUD cho phần quản trị Lộ trình: Khóa (Course) → Bài (RoadmapLesson) →
// 7 phần kỹ năng (RoadmapSection.content). Bật/ẩn dùng setContentPublishedAction
// chung (admin.ts); đổi thứ tự bài dùng reorderRoadmapLessonsAction ở dưới.
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HSKLevel, Prisma, Skill } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-guard";
import { LEVELS, type SkillKey } from "@/lib/roadmap";
import { validateSectionContent } from "@/lib/roadmap-content";
import {
  generateReadingQuestions,
  generateListeningQuestions,
  generateTranscriptExplanation,
  isGradingConfigured,
} from "@/lib/groq";

type Result<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

// Thứ tự cố định của 7 phần trong một bài (khớp SKILL_META).
const SKILL_ORDER: Record<SkillKey, number> = {
  VOCAB: 1,
  GRAMMAR: 2,
  HANZI: 3,
  READING: 4,
  LISTENING: 5,
  WRITING: 6,
  SPEAKING: 7,
};
const SKILL_KEYS = Object.keys(SKILL_ORDER) as SkillKey[];

function revalidateRoadmap(level?: HSKLevel | null) {
  revalidatePath("/admin/roadmap");
  revalidatePath("/roadmap");
  if (level) revalidatePath(`/roadmap/${level.toLowerCase()}`);
  revalidatePath("/dashboard");
}

function optStr(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

// ───────────────────────── Course (Khóa HSK) ─────────────────────────

/** Tạo khóa cho một cấp HSK nếu chưa có (Course.hskLevel là @unique → 1 khóa/cấp). */
export async function createCourseForLevelAction(level: string): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    if (!(LEVELS as readonly string[]).includes(level)) {
      return { ok: false, error: "Cấp HSK không hợp lệ." };
    }
    const hskLevel = level as HSKLevel;
    const existing = await db.course.findUnique({ where: { hskLevel }, select: { id: true } });
    if (existing) return { ok: true, data: { id: existing.id } };

    const n = LEVELS.indexOf(hskLevel as (typeof LEVELS)[number]) + 1;
    const created = await db.course.create({
      data: {
        hskLevel,
        title: `Lộ trình HSK ${n}`,
        titleZh: "",
        order: n,
        published: true,
      },
      select: { id: true },
    });
    revalidateRoadmap(hskLevel);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo khóa." };
  }
}

export async function updateCourseAction(fd: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const id = optStr(fd, "id");
    const title = optStr(fd, "title");
    if (!id || !title) return { ok: false, error: "Thiếu tiêu đề khóa." };
    const course = await db.course.update({
      where: { id },
      data: {
        title,
        titleZh: optStr(fd, "titleZh") ?? "",
        description: optStr(fd, "description"),
        imageUrl: optStr(fd, "imageUrl"),
      },
      select: { hskLevel: true },
    });
    revalidateRoadmap(course.hskLevel);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật khóa." };
  }
}

// ───────────────────────── RoadmapLesson (Bài) ─────────────────────────

const lessonSchema = z.object({
  topic: z.string().trim().min(1, "Thiếu tên bài."),
  topicZh: z.string().trim().default(""),
  icon: z.string().trim().optional(),
  description: z.string().trim().optional(),
  chapter: z.string().trim().optional(),
  chapterOrder: z.coerce.number().int().min(1).default(1),
  xpReward: z.coerce.number().int().min(0).default(20),
});

function lessonDataFromForm(fd: FormData) {
  return lessonSchema.safeParse({
    topic: fd.get("topic") ?? "",
    topicZh: fd.get("topicZh") ?? "",
    icon: fd.get("icon") ?? undefined,
    description: fd.get("description") ?? undefined,
    chapter: fd.get("chapter") ?? undefined,
    chapterOrder: fd.get("chapterOrder") ?? 1,
    xpReward: fd.get("xpReward") ?? 20,
  });
}

export async function createRoadmapLessonAction(fd: FormData): Promise<Result<{ id: string }>> {
  try {
    await requireAdmin();
    const courseId = optStr(fd, "courseId");
    if (!courseId) return { ok: false, error: "Thiếu khóa." };
    const parsed = lessonDataFromForm(fd);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const course = await db.course.findUnique({ where: { id: courseId }, select: { hskLevel: true } });
    if (!course) return { ok: false, error: "Không tìm thấy khóa." };

    const agg = await db.roadmapLesson.aggregate({ where: { courseId }, _max: { order: true } });
    const order = (agg._max.order ?? 0) + 1;

    const created = await db.roadmapLesson.create({
      data: {
        courseId,
        order,
        topic: parsed.data.topic,
        topicZh: parsed.data.topicZh,
        icon: parsed.data.icon ?? null,
        description: parsed.data.description ?? null,
        chapter: parsed.data.chapter ?? null,
        chapterOrder: parsed.data.chapterOrder,
        xpReward: parsed.data.xpReward,
      },
      select: { id: true },
    });
    revalidateRoadmap(course.hskLevel);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo bài." };
  }
}

export async function updateRoadmapLessonAction(fd: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const id = optStr(fd, "id");
    if (!id) return { ok: false, error: "Thiếu bài." };
    const parsed = lessonDataFromForm(fd);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const lesson = await db.roadmapLesson.update({
      where: { id },
      data: {
        topic: parsed.data.topic,
        topicZh: parsed.data.topicZh,
        icon: parsed.data.icon ?? null,
        description: parsed.data.description ?? null,
        chapter: parsed.data.chapter ?? null,
        chapterOrder: parsed.data.chapterOrder,
        xpReward: parsed.data.xpReward,
      },
      select: { course: { select: { hskLevel: true } } },
    });
    revalidateRoadmap(lesson.course.hskLevel);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật bài." };
  }
}

export async function deleteRoadmapLessonAction(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const lesson = await db.roadmapLesson.findUnique({
      where: { id },
      select: { course: { select: { hskLevel: true } } },
    });
    await db.roadmapLesson.delete({ where: { id } });
    revalidateRoadmap(lesson?.course.hskLevel ?? null);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi xoá bài." };
  }
}

/**
 * Đổi thứ tự các bài trong một khóa. RoadmapLesson có @@unique([courseId, order])
 * nên phải gán order tạm (lệch lớn) trước rồi mới gán 1..n để tránh đụng ràng buộc.
 */
export async function reorderRoadmapLessonsAction(
  courseId: string,
  orderedIds: string[]
): Promise<Result> {
  try {
    await requireAdmin();
    if (orderedIds.length === 0) return { ok: true };
    const lessons = await db.roadmapLesson.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, courseId: true },
    });
    if (lessons.length !== orderedIds.length || lessons.some((l) => l.courseId !== courseId)) {
      return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
    }
    const OFFSET = 100000;
    await db.$transaction([
      ...orderedIds.map((id, i) =>
        db.roadmapLesson.update({ where: { id }, data: { order: OFFSET + i + 1 } })
      ),
      ...orderedIds.map((id, i) =>
        db.roadmapLesson.update({ where: { id }, data: { order: i + 1 } })
      ),
    ]);
    revalidatePath("/admin/roadmap");
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự bài." };
  }
}

// ───────────────────────── RoadmapSection (nội dung 7 phần) ─────────────────────────

const saveSectionSchema = z.object({
  lessonId: z.string().min(1),
  skill: z.enum(SKILL_KEYS as [SkillKey, ...SkillKey[]]),
  content: z.unknown(),
  publish: z.boolean().optional(),
});

/** Lưu (tạo/cập nhật) nội dung một phần kỹ năng của bài. Upsert theo (lessonId, skill). */
export async function saveRoadmapSectionAction(
  input: z.infer<typeof saveSectionSchema>
): Promise<Result<{ sectionId: string }>> {
  try {
    await requireAdmin();
    const parsed = saveSectionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
    const { lessonId, skill, publish } = parsed.data;

    const valid = validateSectionContent(skill, parsed.data.content);
    if (!valid.ok) return { ok: false, error: valid.error };

    const lesson = await db.roadmapLesson.findUnique({
      where: { id: lessonId },
      select: { course: { select: { hskLevel: true } } },
    });
    if (!lesson) return { ok: false, error: "Không tìm thấy bài." };

    const content = valid.data as Prisma.InputJsonValue;
    const skillEnum = skill as Skill;

    const section = await db.roadmapSection.upsert({
      where: { lessonId_skill: { lessonId, skill: skillEnum } },
      update: {
        content,
        order: SKILL_ORDER[skill],
        ...(publish !== undefined ? { published: publish } : {}),
      },
      create: {
        lessonId,
        skill: skillEnum,
        order: SKILL_ORDER[skill],
        content,
        published: publish ?? false,
      },
      select: { id: true },
    });
    revalidateRoadmap(lesson.course.hskLevel);
    return { ok: true, data: { sectionId: section.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi lưu nội dung." };
  }
}

/** Xoá hẳn nội dung một phần (gỡ section khỏi bài). */
export async function deleteRoadmapSectionAction(input: {
  lessonId: string;
  skill: SkillKey;
}): Promise<Result> {
  try {
    await requireAdmin();
    const { lessonId, skill } = input;
    if (!SKILL_KEYS.includes(skill)) return { ok: false, error: "Kỹ năng không hợp lệ." };
    await db.roadmapSection.deleteMany({ where: { lessonId, skill: skill as Skill } });
    revalidateRoadmap(null);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi xoá nội dung." };
  }
}

// ───────────── AI hỗ trợ soạn Đọc / Nghe (sinh câu hỏi, dịch lời thoại) ─────────────
// Khác phiên bản ở admin.ts: nhận NỘI DUNG trực tiếp (đoạn văn / lời thoại / cấp HSK)
// thay vì id bản ghi DB, vì nội dung lộ trình nằm trong RoadmapSection.content.

function clampCount(n: number): number {
  return Math.max(1, Math.min(20, Math.round(n) || 5));
}

export async function generateRoadmapReadingQuestionsAction(input: {
  passage: string;
  hskLevel: HSKLevel;
  count: number;
}): Promise<Result<{ json: string }>> {
  try {
    await requireAdmin();
    if (!isGradingConfigured()) return { ok: false, error: "Máy chủ chưa cấu hình GROQ_API_KEY." };
    const passage = (input.passage || "").trim();
    if (!passage) return { ok: false, error: "Chưa có đoạn văn để AI tạo câu hỏi." };
    const questions = await generateReadingQuestions({
      passage,
      hskLevel: input.hskLevel,
      count: clampCount(input.count),
    });
    if (!questions.length) return { ok: false, error: "AI chưa tạo được câu hỏi nào — thử lại." };
    return { ok: true, data: { json: JSON.stringify(questions, null, 2) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi gọi AI (Groq)." };
  }
}

export async function generateRoadmapListeningQuestionsAction(input: {
  transcript: string;
  hskLevel: HSKLevel;
  count: number;
}): Promise<Result<{ json: string }>> {
  try {
    await requireAdmin();
    if (!isGradingConfigured()) return { ok: false, error: "Máy chủ chưa cấu hình GROQ_API_KEY." };
    const transcript = (input.transcript || "").trim();
    if (!transcript) return { ok: false, error: "Chưa có lời thoại để AI tạo câu hỏi." };
    const questions = await generateListeningQuestions({
      transcript,
      hskLevel: input.hskLevel,
      count: clampCount(input.count),
    });
    if (!questions.length) return { ok: false, error: "AI chưa tạo được câu hỏi nào — thử lại." };
    return { ok: true, data: { json: JSON.stringify(questions, null, 2) } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi gọi AI (Groq)." };
  }
}

export async function generateRoadmapTranscriptExplanationAction(input: {
  transcript: string;
  hskLevel: HSKLevel;
}): Promise<Result<{ text: string }>> {
  try {
    await requireAdmin();
    if (!isGradingConfigured()) return { ok: false, error: "Máy chủ chưa cấu hình GROQ_API_KEY." };
    const transcript = (input.transcript || "").trim();
    if (!transcript) return { ok: false, error: "Chưa có lời thoại để AI dịch." };
    const ex = await generateTranscriptExplanation({ transcript, hskLevel: input.hskLevel });
    if (!ex.translation && ex.vocab.length === 0) return { ok: false, error: "AI chưa dịch được — thử lại." };
    const parts: string[] = [];
    if (ex.summary) parts.push(ex.summary);
    if (ex.translation) parts.push(`— Dịch lời thoại —\n${ex.translation}`);
    if (ex.vocab.length) {
      const lines = ex.vocab
        .map((v) => `• ${v.zh}${v.pinyin ? ` (${v.pinyin})` : ""} — ${v.vi}`)
        .join("\n");
      parts.push(`— Từ vựng —\n${lines}`);
    }
    return { ok: true, data: { text: parts.join("\n\n") } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi gọi AI (Groq)." };
  }
}
