"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { gradeSpeaking, isGradingConfigured } from "@/lib/groq";
import { Skill, Prisma } from "@prisma/client";

const schema = z.object({
  setId: z.string(),
  transcript: z.string().min(1),
  referenceText: z.string().nullable(),
  part: z.enum(["repeat", "read", "answer"]),
  question: z.string().nullable(),
  index: z.number().int().nonnegative(),
  durationSec: z.number().optional(),
});

// Grades one HSKK speaking recording with Groq and persists the result as an
// Attempt (mirrors gradeWritingAction). The audio→transcript step stays in the
// /api/transcribe route (Voxtral) because it uploads a multipart audio file;
// only the text grading + persistence lives here so the speaking list page can
// show attempt counts and best scores like every other skill.
export async function gradeSpeakingAction(input: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Unauthorized" };

  if (!isGradingConfigured()) {
    return {
      ok: false as const,
      error: "Chức năng chấm điểm AI chưa được cấu hình (thiếu GROQ_API_KEY).",
    };
  }

  const { setId, transcript, referenceText, part, question, index, durationSec } =
    schema.parse(input);

  // hskLevel comes from the DB, never the client.
  const set = await db.speakingSet.findUnique({ where: { id: setId } });
  if (!set) return { ok: false as const, error: "Set not found" };

  try {
    const result = await gradeSpeaking({
      transcript,
      referenceText,
      part,
      question,
      hskLevel: set.hskLevel,
    });

    await db.$transaction([
      db.attempt.create({
        data: {
          userId: session.user.id,
          skill: Skill.SPEAKING,
          refId: setId,
          rawAnswer: { transcript, part, index, referenceText, question } as Prisma.InputJsonValue,
          score: result.score,
          feedback: result as unknown as Prisma.InputJsonValue,
          durationSec,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: Math.round(result.score / 10) }, lastActiveAt: new Date() },
      }),
    ]);

    return { ok: true as const, result };
  } catch (e) {
    console.error("Speaking grade error:", e);
    return { ok: false as const, error: "AI grading failed" };
  }
}
