"use server";
// CRUD cho phần quản trị Lộ trình: Khóa (Course) → Bài (RoadmapLesson) →
// 7 phần kỹ năng (RoadmapSection.content). Bật/ẩn dùng setContentPublishedAction
// chung (admin.ts); đổi thứ tự bài dùng reorderRoadmapLessonsAction ở dưới.
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HSKLevel, Prisma, Skill } from "@prisma/client";
import { requireAdmin, requireAdminActor } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit";
import { LEVELS, UNCHAPTERED_ORDER, type SkillKey } from "@/lib/roadmap";
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
    const { actor } = await requireAdminActor();
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
      select: { id: true, title: true },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "Course",
      entityId: created.id,
      summary: `Tạo khóa «${created.title}»`,
      after: created,
    });
    revalidateRoadmap(hskLevel);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo khóa." };
  }
}

export async function updateCourseAction(fd: FormData): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    const id = optStr(fd, "id");
    const title = optStr(fd, "title");
    if (!id || !title) return { ok: false, error: "Thiếu tiêu đề khóa." };
    const before = await db.course.findUnique({ where: { id } });
    const course = await db.course.update({
      where: { id },
      data: {
        title,
        titleZh: optStr(fd, "titleZh") ?? "",
        description: optStr(fd, "description"),
        imageUrl: optStr(fd, "imageUrl"),
      },
    });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "Course",
      entityId: course.id,
      summary: `Sửa khóa «${course.title}»`,
      before,
      after: course,
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
  // Bài thuộc chương nào (RoadmapChapter.id). Rỗng = chưa phân chương.
  chapterId: z.string().trim().optional(),
  xpReward: z.coerce.number().int().min(0).default(20),
});

function lessonDataFromForm(fd: FormData) {
  return lessonSchema.safeParse({
    topic: fd.get("topic") ?? "",
    topicZh: fd.get("topicZh") ?? "",
    icon: fd.get("icon") ?? undefined,
    description: fd.get("description") ?? undefined,
    chapterId: fd.get("chapterId") ?? undefined,
    xpReward: fd.get("xpReward") ?? 20,
  });
}

/**
 * Suy ra bộ trường chương cho một bài từ `chapterId` đã chọn:
 *  - `chapterId` => khoá ngoại (nguồn sự thật)
 *  - `chapter` / `chapterOrder` => bản sao (cache) để học viên gom bài theo chương.
 * Trả về `null` nếu chương không tồn tại hoặc không cùng khóa (đầu vào không hợp lệ).
 */
async function resolveChapterFields(
  courseId: string,
  chapterId: string | null | undefined
): Promise<{ chapterId: string | null; chapter: string | null; chapterOrder: number } | null> {
  const id = chapterId && chapterId.length ? chapterId : null;
  // Chưa phân chương: chapter=null (tín hiệu UI) + chapterOrder sentinel để xếp cuối.
  if (!id) return { chapterId: null, chapter: null, chapterOrder: UNCHAPTERED_ORDER };
  const ch = await db.roadmapChapter.findUnique({
    where: { id },
    select: { courseId: true, order: true, title: true },
  });
  if (!ch || ch.courseId !== courseId) return null;
  return { chapterId: id, chapter: ch.title, chapterOrder: ch.order };
}

export async function createRoadmapLessonAction(fd: FormData): Promise<Result<{ id: string }>> {
  try {
    const { actor } = await requireAdminActor();
    const courseId = optStr(fd, "courseId");
    if (!courseId) return { ok: false, error: "Thiếu khóa." };
    const parsed = lessonDataFromForm(fd);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const course = await db.course.findUnique({ where: { id: courseId }, select: { hskLevel: true } });
    if (!course) return { ok: false, error: "Không tìm thấy khóa." };

    const chapterFields = await resolveChapterFields(courseId, parsed.data.chapterId);
    if (!chapterFields) return { ok: false, error: "Chương đã chọn không hợp lệ." };

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
        ...chapterFields,
        xpReward: parsed.data.xpReward,
      },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "RoadmapLesson",
      entityId: created.id,
      summary: `Tạo bài «${created.topic}»`,
      after: created,
    });
    revalidateRoadmap(course.hskLevel);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo bài." };
  }
}

export async function updateRoadmapLessonAction(fd: FormData): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    const id = optStr(fd, "id");
    if (!id) return { ok: false, error: "Thiếu bài." };
    const parsed = lessonDataFromForm(fd);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const existing = await db.roadmapLesson.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Không tìm thấy bài." };

    const chapterFields = await resolveChapterFields(existing.courseId, parsed.data.chapterId);
    if (!chapterFields) return { ok: false, error: "Chương đã chọn không hợp lệ." };

    const lesson = await db.roadmapLesson.update({
      where: { id },
      data: {
        topic: parsed.data.topic,
        topicZh: parsed.data.topicZh,
        icon: parsed.data.icon ?? null,
        description: parsed.data.description ?? null,
        ...chapterFields,
        xpReward: parsed.data.xpReward,
      },
      include: { course: { select: { hskLevel: true } } },
    });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "RoadmapLesson",
      entityId: lesson.id,
      summary: `Sửa bài «${lesson.topic}»`,
      before: existing,
      after: lesson,
    });
    revalidateRoadmap(lesson.course.hskLevel);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật bài." };
  }
}

export async function deleteRoadmapLessonAction(id: string): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    const lesson = await db.roadmapLesson.findUnique({
      where: { id },
      select: { course: { select: { hskLevel: true } } },
    });
    const deleted = await db.roadmapLesson.delete({ where: { id } });
    await logAudit({
      actor,
      action: "DELETE",
      entity: "RoadmapLesson",
      entityId: deleted.id,
      summary: `Xóa bài «${deleted.topic}»`,
      before: deleted,
    });
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
    const { actor } = await requireAdminActor();
    if (orderedIds.length === 0) return { ok: true };
    const lessons = await db.roadmapLesson.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, courseId: true, order: true },
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
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "RoadmapLesson",
      entityId: courseId,
      summary: `Sắp xếp lại thứ tự bài`,
      before: lessons.map((l) => ({ id: l.id, order: l.order })),
      after: orderedIds.map((id, i) => ({ id, order: i + 1 })),
    });
    revalidatePath("/admin/roadmap");
    revalidatePath("/roadmap");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự bài." };
  }
}

// ───────────────────────── RoadmapChapter (Chương) ─────────────────────────
// Chương là nguồn sự thật do admin quản lý. Mỗi thay đổi (đổi tên / đổi thứ tự /
// xoá) phải đồng bộ lại bản sao `chapter` / `chapterOrder` trên các bài thuộc chương
// để phía học viên (gom bài theo chương) luôn khớp.

const chapterSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tên chương."),
  titleZh: z.string().trim().default(""),
});

async function courseLevel(courseId: string): Promise<HSKLevel | null> {
  const c = await db.course.findUnique({ where: { id: courseId }, select: { hskLevel: true } });
  return c?.hskLevel ?? null;
}

/** Tạo chương mới cho khóa (order = chương lớn nhất + 1). */
export async function createRoadmapChapterAction(fd: FormData): Promise<Result<{ id: string }>> {
  try {
    const { actor } = await requireAdminActor();
    const courseId = optStr(fd, "courseId");
    if (!courseId) return { ok: false, error: "Thiếu khóa." };
    const parsed = chapterSchema.safeParse({
      title: fd.get("title") ?? "",
      titleZh: fd.get("titleZh") ?? "",
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const level = await courseLevel(courseId);
    if (!level) return { ok: false, error: "Không tìm thấy khóa." };

    const agg = await db.roadmapChapter.aggregate({ where: { courseId }, _max: { order: true } });
    const order = (agg._max.order ?? 0) + 1;

    const created = await db.roadmapChapter.create({
      data: { courseId, order, title: parsed.data.title, titleZh: parsed.data.titleZh },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "RoadmapChapter",
      entityId: created.id,
      summary: `Tạo chương «${created.title}»`,
      after: created,
    });
    revalidateRoadmap(level);
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo chương." };
  }
}

/** Đổi tên chương + đồng bộ cache `chapter` (tên) trên các bài thuộc chương. */
export async function updateRoadmapChapterAction(fd: FormData): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    const id = optStr(fd, "id");
    if (!id) return { ok: false, error: "Thiếu chương." };
    const parsed = chapterSchema.safeParse({
      title: fd.get("title") ?? "",
      titleZh: fd.get("titleZh") ?? "",
    });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

    const chapter = await db.roadmapChapter.findUnique({ where: { id } });
    if (!chapter) return { ok: false, error: "Không tìm thấy chương." };

    await db.$transaction([
      db.roadmapChapter.update({
        where: { id },
        data: { title: parsed.data.title, titleZh: parsed.data.titleZh },
      }),
      db.roadmapLesson.updateMany({ where: { chapterId: id }, data: { chapter: parsed.data.title } }),
    ]);
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "RoadmapChapter",
      entityId: id,
      summary: `Sửa chương «${parsed.data.title}»`,
      before: chapter,
      after: { ...chapter, title: parsed.data.title, titleZh: parsed.data.titleZh },
    });
    revalidateRoadmap(await courseLevel(chapter.courseId));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật chương." };
  }
}

/** Xoá chương — chỉ cho phép khi chương không còn bài (tránh bài mồ côi). */
export async function deleteRoadmapChapterAction(id: string): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    const chapter = await db.roadmapChapter.findUnique({
      where: { id },
      select: { courseId: true, _count: { select: { lessons: true } } },
    });
    if (!chapter) return { ok: false, error: "Không tìm thấy chương." };
    if (chapter._count.lessons > 0) {
      return { ok: false, error: "Chương vẫn còn bài — hãy chuyển bài sang chương khác trước khi xoá." };
    }
    const deleted = await db.roadmapChapter.delete({ where: { id } });
    await logAudit({
      actor,
      action: "DELETE",
      entity: "RoadmapChapter",
      entityId: deleted.id,
      summary: `Xóa chương «${deleted.title}»`,
      before: deleted,
    });
    revalidateRoadmap(await courseLevel(chapter.courseId));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi xoá chương." };
  }
}

/**
 * Đổi thứ tự chương trong khóa. RoadmapChapter có @@unique([courseId, order]) nên
 * gán order tạm (lệch lớn) trước rồi gán 1..n để tránh đụng ràng buộc. Sau khi gán
 * order chuẩn, đồng bộ cache `chapterOrder` trên các bài của từng chương.
 */
export async function reorderRoadmapChaptersAction(
  courseId: string,
  orderedIds: string[]
): Promise<Result> {
  try {
    const { actor } = await requireAdminActor();
    if (orderedIds.length === 0) return { ok: true };
    const chapters = await db.roadmapChapter.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, courseId: true, order: true },
    });
    if (chapters.length !== orderedIds.length || chapters.some((c) => c.courseId !== courseId)) {
      return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
    }
    const OFFSET = 100000;
    await db.$transaction([
      ...orderedIds.map((id, i) =>
        db.roadmapChapter.update({ where: { id }, data: { order: OFFSET + i + 1 } })
      ),
      ...orderedIds.map((id, i) =>
        db.roadmapChapter.update({ where: { id }, data: { order: i + 1 } })
      ),
      // Đồng bộ cache chapterOrder của bài theo thứ tự chương mới.
      ...orderedIds.map((id, i) =>
        db.roadmapLesson.updateMany({ where: { chapterId: id }, data: { chapterOrder: i + 1 } })
      ),
    ]);
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "RoadmapChapter",
      entityId: courseId,
      summary: `Sắp xếp lại thứ tự chương`,
      before: chapters.map((c) => ({ id: c.id, order: c.order })),
      after: orderedIds.map((id, i) => ({ id, order: i + 1 })),
    });
    revalidateRoadmap(await courseLevel(courseId));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự chương." };
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
    const { actor } = await requireAdminActor();
    const parsed = saveSectionSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
    const { lessonId, skill, publish } = parsed.data;

    const valid = validateSectionContent(skill, parsed.data.content);
    if (!valid.ok) return { ok: false, error: valid.error };

    const lesson = await db.roadmapLesson.findUnique({
      where: { id: lessonId },
      select: { topic: true, course: { select: { hskLevel: true } } },
    });
    if (!lesson) return { ok: false, error: "Không tìm thấy bài." };

    const content = valid.data as Prisma.InputJsonValue;
    const skillEnum = skill as Skill;

    const before = await db.roadmapSection.findUnique({
      where: { lessonId_skill: { lessonId, skill: skillEnum } },
    });

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
    });
    await logAudit({
      actor,
      action: before ? "UPDATE" : "CREATE",
      entity: "RoadmapSection",
      entityId: section.id,
      summary: `${before ? "Sửa" : "Tạo"} nội dung ${skill} bài «${lesson.topic}»`,
      before: before ?? undefined,
      after: section,
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
    const { actor } = await requireAdminActor();
    const { lessonId, skill } = input;
    if (!SKILL_KEYS.includes(skill)) return { ok: false, error: "Kỹ năng không hợp lệ." };
    const before = await db.roadmapSection.findMany({ where: { lessonId, skill: skill as Skill } });
    await db.roadmapSection.deleteMany({ where: { lessonId, skill: skill as Skill } });
    if (before.length) {
      await logAudit({
        actor,
        action: "DELETE",
        entity: "RoadmapSection",
        entityId: before[0]?.id ?? null,
        summary: `Xóa nội dung ${skill} của bài ${lessonId}`,
        before,
      });
    }
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
