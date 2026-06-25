"use server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { HSKLevel, Skill, QuestionType, Prisma } from "@prisma/client";
import { requireAdminActor } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit";
import { generateReadingExplanation, isGradingConfigured } from "@/lib/groq";

// Chỉ 3 kỹ năng xuất hiện trong đề thi thật.
const EXAM_SKILLS = [Skill.LISTENING, Skill.READING, Skill.WRITING] as const;

function rev(examId: string) {
  revalidatePath(`/admin/exam/${examId}`);
  revalidatePath("/admin/exam");
  revalidatePath("/exam");
}

function optStr(fd: FormData, key: string): string | null {
  const v = (fd.get(key) as string | null)?.trim();
  return v ? v : null;
}

// ===================== Đề (MockExam) =====================
const examSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tiêu đề đề thi."),
  titleZh: z.string().trim().optional(),
  hskLevel: z.nativeEnum(HSKLevel),
  description: z.string().trim().optional(),
  totalTime: z.coerce.number().int().min(0).optional(),
});

export async function createMockExamAction(fd: FormData): Promise<void> {
  const { actor } = await requireAdminActor();
  const data = examSchema.parse(Object.fromEntries(fd));
  const created = await db.mockExam.create({
    data: {
      title: data.title,
      titleZh: data.titleZh || null,
      hskLevel: data.hskLevel,
      description: data.description || null,
      // Form nhập PHÚT, lưu GIÂY (đồng bộ timeLimit các model khác).
      totalTime: data.totalTime && data.totalTime > 0 ? data.totalTime * 60 : null,
      published: false, // bản nháp
    },
  });
  await logAudit({
    actor,
    action: "CREATE",
    entity: "MockExam",
    entityId: created.id,
    summary: `Tạo đề thi «${created.title}»`,
    after: created,
  });
  revalidatePath("/admin/exam");
  redirect(`/admin/exam/${created.id}`);
}

export async function updateMockExamAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const id = (fd.get("id") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id đề thi." };
    const data = examSchema.parse(Object.fromEntries(fd));
    const before = await db.mockExam.findUnique({ where: { id } });
    const updated = await db.mockExam.update({
      where: { id },
      data: {
        title: data.title,
        titleZh: data.titleZh || null,
        hskLevel: data.hskLevel,
        description: data.description || null,
        totalTime: data.totalTime && data.totalTime > 0 ? data.totalTime * 60 : null,
      },
    });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "MockExam",
      entityId: updated.id,
      summary: `Sửa đề thi «${updated.title}»`,
      before,
      after: updated,
    });
    rev(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật đề thi." };
  }
}

export async function deleteMockExamAction(id: string) {
  const { actor } = await requireAdminActor();
  const deleted = await db.mockExam.delete({ where: { id } });
  await logAudit({
    actor,
    action: "DELETE",
    entity: "MockExam",
    entityId: deleted.id,
    summary: `Xóa đề thi «${deleted.title}»`,
    before: deleted,
  });
  revalidatePath("/admin/exam");
  revalidatePath("/exam");
  return { ok: true };
}

// ===================== Phần (Section) =====================
export async function createSectionAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const examId = (fd.get("examId") as string) || "";
    const skill = fd.get("skill") as Skill;
    if (!examId) return { ok: false, error: "Thiếu id đề thi." };
    if (!EXAM_SKILLS.includes(skill as (typeof EXAM_SKILLS)[number])) {
      return { ok: false, error: "Kỹ năng không hợp lệ (chỉ Nghe/Đọc/Viết)." };
    }
    const count = await db.mockExamSection.count({ where: { examId } });
    const created = await db.mockExamSection.create({
      data: {
        examId,
        skill,
        title: optStr(fd, "title") ?? "",
        instructions: optStr(fd, "instructions"),
        order: count + 1,
      },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "MockExamSection",
      entityId: created.id,
      summary: `Tạo phần «${created.title || created.skill}»`,
      after: created,
    });
    rev(examId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo phần." };
  }
}

export async function updateSectionAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const id = (fd.get("id") as string) || "";
    const examId = (fd.get("examId") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id phần." };
    const before = await db.mockExamSection.findUnique({ where: { id } });
    const updated = await db.mockExamSection.update({
      where: { id },
      data: { title: optStr(fd, "title") ?? "", instructions: optStr(fd, "instructions") },
    });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "MockExamSection",
      entityId: updated.id,
      summary: `Sửa phần «${updated.title || updated.skill}»`,
      before,
      after: updated,
    });
    rev(examId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật phần." };
  }
}

export async function deleteSectionAction(id: string, examId: string) {
  const { actor } = await requireAdminActor();
  const deleted = await db.mockExamSection.delete({ where: { id } });
  await logAudit({
    actor,
    action: "DELETE",
    entity: "MockExamSection",
    entityId: deleted.id,
    summary: `Xóa phần «${deleted.title || deleted.skill}»`,
    before: deleted,
  });
  rev(examId);
  return { ok: true };
}

// ===================== Tiểu phần (Part) =====================
const partSchema = z.object({
  sectionId: z.string().min(1),
  title: z.string().trim().optional(),
  instructions: z.string().trim().optional(),
  imageUrl: z.string().trim().optional(),
  passage: z.string().trim().optional(),
  passagePinyin: z.string().trim().optional(),
  audioUrl: z.string().trim().optional(),
  transcript: z.string().trim().optional(),
  writingPrompt: z.string().trim().optional(),
  writingMinChars: z.coerce.number().int().min(0).optional(),
});

function partData(input: z.infer<typeof partSchema>) {
  return {
    title: input.title?.trim() || "",
    instructions: input.instructions?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    passage: input.passage?.trim() || null,
    passagePinyin: input.passagePinyin?.trim() || null,
    audioUrl: input.audioUrl?.trim() || null,
    transcript: input.transcript?.trim() || null,
    writingPrompt: input.writingPrompt?.trim() || null,
    writingMinChars:
      input.writingMinChars && input.writingMinChars > 0 ? input.writingMinChars : null,
  };
}

// examId truyền kèm chỉ để revalidate đúng trang.
export async function createPartAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const examId = (fd.get("examId") as string) || "";
    const data = partSchema.parse(Object.fromEntries(fd));
    const count = await db.mockExamPart.count({ where: { sectionId: data.sectionId } });
    const created = await db.mockExamPart.create({
      data: { sectionId: data.sectionId, order: count + 1, ...partData(data) },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "MockExamPart",
      entityId: created.id,
      summary: `Tạo tiểu phần «${created.title || created.id}»`,
      after: created,
    });
    rev(examId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo tiểu phần." };
  }
}

export async function updatePartAction(fd: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const id = (fd.get("id") as string) || "";
    const examId = (fd.get("examId") as string) || "";
    if (!id) return { ok: false, error: "Thiếu id tiểu phần." };
    const data = partSchema.parse(Object.fromEntries(fd));
    const before = await db.mockExamPart.findUnique({ where: { id } });
    const updated = await db.mockExamPart.update({ where: { id }, data: partData(data) });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "MockExamPart",
      entityId: updated.id,
      summary: `Sửa tiểu phần «${updated.title || updated.id}»`,
      before,
      after: updated,
    });
    rev(examId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi cập nhật tiểu phần." };
  }
}

export async function deletePartAction(id: string, examId: string) {
  const { actor } = await requireAdminActor();
  const deleted = await db.mockExamPart.delete({ where: { id } });
  await logAudit({
    actor,
    action: "DELETE",
    entity: "MockExamPart",
    entityId: deleted.id,
    summary: `Xóa tiểu phần «${deleted.title || deleted.id}»`,
    before: deleted,
  });
  rev(examId);
  return { ok: true };
}

// ===================== Câu hỏi trong tiểu phần =====================
// Như createQuestionAction (admin.ts) nhưng gắn examPartId. Với câu Đọc, nếu admin
// để trống giải thích thì nhờ Groq sinh sẵn (dùng passage của tiểu phần làm ngữ cảnh).
export async function createExamQuestionAction(
  fd: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    const examId = (fd.get("examId") as string) || "";
    const examPartId = (fd.get("examPartId") as string) || "";
    const type = fd.get("type") as QuestionType;
    const prompt = ((fd.get("prompt") as string) || "").trim();
    if (!examPartId) return { ok: false, error: "Thiếu id tiểu phần." };
    if (!prompt) return { ok: false, error: "Thiếu nội dung câu hỏi." };

    let options: Prisma.InputJsonValue | undefined;
    let correctAnswer: Prisma.InputJsonValue = {};
    let correctAnswerText = "";

    if (type === "MCQ") {
      const opts = ((fd.get("options") as string) || "")
        .split("\n")
        .filter(Boolean)
        .map((t) => ({ text: t.trim() }));
      if (opts.length < 2) return { ok: false, error: "MCQ cần ít nhất 2 lựa chọn." };
      options = opts as Prisma.InputJsonValue;
      const idx = parseInt(fd.get("correctIndex") as string) || 0;
      correctAnswer = { index: idx };
      correctAnswerText = opts[idx]?.text ?? "";
    } else if (type === "TRUE_FALSE") {
      const value = fd.get("correctBool") === "true";
      correctAnswer = { value };
      correctAnswerText = value ? "Đúng" : "Sai";
    } else if (type === "FILL_BLANK") {
      const accepted = ((fd.get("correctAccepted") as string) || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const text = ((fd.get("correctText") as string) || "").trim();
      correctAnswer = { text, accepted };
      correctAnswerText = text;
    }

    // Giải thích: ưu tiên admin nhập; trống → Groq sinh sẵn từ passage của tiểu phần.
    let explanation = ((fd.get("explanation") as string) || "").trim() || undefined;
    let supportingQuote: string | undefined;
    if (!explanation && isGradingConfigured()) {
      try {
        const part = await db.mockExamPart.findUnique({
          where: { id: examPartId },
          select: { passage: true, section: { select: { exam: { select: { hskLevel: true } } } } },
        });
        if (part?.passage) {
          const r = await generateReadingExplanation({
            passage: part.passage,
            prompt,
            correctAnswer: correctAnswerText,
            hskLevel: part.section.exam.hskLevel,
          });
          explanation = r.explanation || undefined;
          supportingQuote = r.supportingQuote || undefined;
        }
      } catch (e) {
        console.error("generateReadingExplanation (exam) failed:", e);
      }
    }

    const count = await db.question.count({ where: { examPartId } });
    const created = await db.question.create({
      data: {
        type,
        prompt,
        promptPinyin: optStr(fd, "promptPinyin"),
        options: options ?? Prisma.JsonNull,
        correctAnswer,
        explanation,
        supportingQuote,
        examPartId,
        order: count + 1,
      },
    });
    await logAudit({
      actor,
      action: "CREATE",
      entity: "Question",
      entityId: created.id,
      summary: `Tạo câu hỏi «${prompt.slice(0, 50)}»`,
      after: created,
    });
    rev(examId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi tạo câu hỏi." };
  }
}

export async function deleteExamQuestionAction(questionId: string, examId: string) {
  const { actor } = await requireAdminActor();
  const deleted = await db.question.delete({ where: { id: questionId } });
  await logAudit({
    actor,
    action: "DELETE",
    entity: "Question",
    entityId: deleted.id,
    summary: `Xóa câu hỏi «${deleted.prompt.slice(0, 50)}»`,
    before: deleted,
  });
  rev(examId);
  return { ok: true };
}

// ===================== Đổi thứ tự đề trong một cấp HSK =====================
export async function reorderMockExamsAction(
  hskLevel: HSKLevel,
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { actor } = await requireAdminActor();
    if (orderedIds.length === 0) return { ok: true };
    const rows = await db.mockExam.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, hskLevel: true, order: true },
    });
    if (rows.length !== orderedIds.length || rows.some((r) => r.hskLevel !== hskLevel)) {
      return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
    }
    const before = [...rows].sort((a, b) => a.order - b.order).map((r) => r.id);
    await db.$transaction(
      orderedIds.map((id, i) => db.mockExam.update({ where: { id }, data: { order: i + 1 } })),
    );
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "MockExam",
      summary: `Sắp xếp lại thứ tự đề thi ${hskLevel}`,
      before,
      after: orderedIds,
    });
    revalidatePath("/admin/exam");
    revalidatePath("/exam");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Lỗi đổi thứ tự đề." };
  }
}
