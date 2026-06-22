"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { gradeWriting, isGradingConfigured } from "@/lib/groq";
import { Skill, Prisma } from "@prisma/client";

const schema = z.object({
  taskId: z.string(),
  submission: z.string().min(1),
  durationSec: z.number().optional(),
});

export async function gradeWritingAction(input: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  if (!isGradingConfigured()) {
    return { ok: false, error: "Chức năng chấm điểm AI chưa được cấu hình (thiếu GROQ_API_KEY)." };
  }

  const { taskId, submission, durationSec } = schema.parse(input);

  const task = await db.writingTask.findUnique({ where: { id: taskId } });
  if (!task) return { ok: false, error: "Task not found" };

  try {
    const result = await gradeWriting({
      submission,
      hskLevel: task.hskLevel,
      taskPrompt: task.prompt,
      minChars: task.minChars,
      outline: task.outline,
    });

    await db.$transaction([
      db.attempt.create({
        data: {
          userId: session.user.id,
          skill: Skill.WRITING,
          refId: taskId,
          rawAnswer: { submission },
          score: result.score,
          feedback: result as unknown as Prisma.InputJsonValue,
          durationSec,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: Math.round(result.score / 5) }, lastActiveAt: new Date() },
      }),
    ]);

    return { ok: true, result };
  } catch (e) {
    console.error("Writing grade error:", e);
    return { ok: false, error: "AI grading failed" };
  }
}
