"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Skill, Prisma, QuestionType } from "@prisma/client";
import { gradeWriting, isGradingConfigured, type WritingGradeResult } from "@/lib/groq";

// Ngưỡng đạt: 60% — tương đương 180/300 (HSK3–6) và 120/200 (HSK1–2) của đề thật.
const PASS_THRESHOLD = 60;

const schema = z.object({
  examId: z.string().min(1),
  answers: z.record(z.unknown()), // { questionId: đáp án người dùng }
  essays: z.record(z.string()).optional(), // { partId: bài viết tự luận }
  durationSec: z.number().int().nonnegative().optional(),
});

// Chuẩn hoá để so khớp đáp án điền — bỏ khoảng trắng, NFKC, thường hoá. (Giống
// logic trong src/server/actions/reading.ts để hành vi chấm nhất quán.)
function normalize(v: unknown): string {
  return String(v ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function gradeQuestion(
  type: QuestionType,
  correctAnswer: unknown,
  userAnswer: unknown,
): boolean {
  const ca = (correctAnswer ?? {}) as {
    index?: number;
    value?: boolean;
    text?: string;
    accepted?: string[];
  };
  if (type === "MCQ") return typeof ca.index === "number" && userAnswer === ca.index;
  if (type === "TRUE_FALSE") return typeof ca.value === "boolean" && userAnswer === ca.value;
  if (type === "FILL_BLANK" || type === "SHORT_ANSWER") {
    const accepted = [
      ...(ca.text ? [ca.text] : []),
      ...(Array.isArray(ca.accepted) ? ca.accepted : []),
    ].map(normalize);
    const ua = normalize(userAnswer);
    return ua.length > 0 && accepted.includes(ua);
  }
  return false; // MATCHING chưa hỗ trợ → tính sai/0 điểm
}

export interface ExamSectionResult {
  skill: Skill;
  title: string;
  /** Điểm phần quy về thang 100; null = không chấm được (vd phần Viết khi thiếu AI). */
  score: number | null;
  correct: number; // số câu auto đúng
  total: number; // số câu auto trong phần
}

export interface ExamGradeResult {
  overall: number; // điểm tổng (trung bình các phần chấm được), 0–100
  passed: boolean;
  sections: ExamSectionResult[];
  details: Record<string, boolean>; // qid → đúng/sai
  essays: Record<string, WritingGradeResult | { ungraded: true }>; // partId → kết quả
}

export async function submitMockExamAction(
  input: z.infer<typeof schema>,
): Promise<{ ok: true; result: ExamGradeResult } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ." };
  const { examId, answers, essays = {}, durationSec } = parsed.data;

  const exam = await db.mockExam.findUnique({
    where: { id: examId },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          parts: {
            orderBy: { order: "asc" },
            include: { questions: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  if (!exam) return { ok: false, error: "Không tìm thấy đề thi." };

  const details: Record<string, boolean> = {};
  const aiConfigured = isGradingConfigured();

  // Gom các bài viết tự luận cần chấm AI để chạy song song (mỗi đề thường 1–2 bài).
  const essayJobs: Array<{
    partId: string;
    promise: Promise<WritingGradeResult>;
  }> = [];
  for (const section of exam.sections) {
    for (const part of section.parts) {
      const submission = (essays[part.id] ?? "").trim();
      if (part.writingPrompt && submission && aiConfigured) {
        essayJobs.push({
          partId: part.id,
          promise: gradeWriting({
            submission,
            hskLevel: exam.hskLevel,
            taskPrompt: part.writingPrompt,
            minChars: part.writingMinChars ?? 0,
            outline: part.instructions,
          }),
        });
      }
    }
  }

  const essays_out: Record<string, WritingGradeResult | { ungraded: true }> = {};
  const settled = await Promise.allSettled(essayJobs.map((j) => j.promise));
  settled.forEach((res, i) => {
    const partId = essayJobs[i].partId;
    if (res.status === "fulfilled") essays_out[partId] = res.value;
    else essays_out[partId] = { ungraded: true };
  });
  // Bài viết đã nộp nhưng không chấm được (thiếu AI) → đánh dấu "chưa chấm".
  for (const section of exam.sections) {
    for (const part of section.parts) {
      const submission = (essays[part.id] ?? "").trim();
      if (part.writingPrompt && submission && !essays_out[part.id]) {
        essays_out[part.id] = { ungraded: true };
      }
    }
  }

  // Tính điểm từng phần. Câu hỏi auto = 1 điểm/câu; bài viết = aiScore/100.
  const sections: ExamSectionResult[] = exam.sections.map((section) => {
    let earned = 0;
    let max = 0;
    let correct = 0;
    let total = 0;
    for (const part of section.parts) {
      for (const q of part.questions) {
        const ok = gradeQuestion(q.type, q.correctAnswer, answers[q.id]);
        details[q.id] = ok;
        total += 1;
        max += 1;
        if (ok) {
          correct += 1;
          earned += 1;
        }
      }
      if (part.writingPrompt) {
        const r = essays_out[part.id];
        const submission = (essays[part.id] ?? "").trim();
        if (r && "score" in r) {
          // chấm được bằng AI
          earned += r.score / 100;
          max += 1;
        } else if (submission && !aiConfigured) {
          // đã viết nhưng không có AI → bỏ khỏi mẫu số (không tính 0 oan)
        } else if (!submission) {
          // bỏ trống → tính 0 điểm trên thang phần
          max += 1;
        }
      }
    }
    const score = max > 0 ? Math.round((earned / max) * 100) : null;
    return { skill: section.skill, title: section.title, score, correct, total };
  });

  const scored = sections.map((s) => s.score).filter((s): s is number => s !== null);
  const overall = scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0;
  const passed = overall >= PASS_THRESHOLD;

  const result: ExamGradeResult = { overall, passed, sections, details, essays: essays_out };

  try {
    await db.$transaction([
      db.attempt.create({
        data: {
          userId: session.user.id,
          skill: Skill.MOCK,
          refId: examId,
          rawAnswer: { answers, essays } as Prisma.InputJsonValue,
          score: overall,
          feedback: result as unknown as Prisma.InputJsonValue,
          durationSec: durationSec ?? null,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: Math.round(overall / 5) }, lastActiveAt: new Date() },
      }),
    ]);
  } catch (e) {
    console.error("Mock exam submit error:", e);
    return { ok: false, error: "Lỗi lưu kết quả, thử lại sau." };
  }

  return { ok: true, result };
}
