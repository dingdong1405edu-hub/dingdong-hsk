"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Skill, Prisma } from "@prisma/client";

const submitSchema = z.object({
  testId: z.string(),
  answers: z.record(z.unknown()),
});

export async function submitReadingAction(input: z.infer<typeof submitSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const { testId, answers } = submitSchema.parse(input);

  const test = await db.readingTest.findUnique({
    where: { id: testId },
    include: { questions: true },
  });
  if (!test) return { ok: false, error: "Test not found" };

  const details: Record<string, boolean> = {};
  let correct = 0;

  for (const q of test.questions) {
    const userAnswer = answers[q.id];
    const correctAnswer = q.correctAnswer as { index?: number; value?: boolean };
    let isCorrect = false;

    if (q.type === "MCQ") {
      isCorrect = userAnswer === correctAnswer.index;
    } else if (q.type === "TRUE_FALSE") {
      isCorrect = userAnswer === correctAnswer.value;
    }

    details[q.id] = isCorrect;
    if (isCorrect) correct++;
  }

  // Guard divide-by-zero: a test may legitimately have no questions yet.
  const totalQuestions = test.questions.length;
  const score = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;
  const xpEarned = Math.round(score / 10);

  try {
    await db.$transaction([
      db.attempt.create({
        data: {
          userId: session.user.id,
          skill: Skill.READING,
          refId: testId,
          rawAnswer: answers as Prisma.InputJsonValue,
          score,
          feedback: { details } as Prisma.InputJsonValue,
        },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: xpEarned }, lastActiveAt: new Date() },
      }),
    ]);
  } catch (e) {
    console.error("Reading submit error:", e);
    return { ok: false, error: "DB error" };
  }

  return { ok: true, result: { score, details } };
}
