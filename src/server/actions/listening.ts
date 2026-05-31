"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Skill, Prisma } from "@prisma/client";

const schema = z.object({
  testId: z.string(),
  answers: z.record(z.unknown()),
});

export async function submitListeningAction(input: z.infer<typeof schema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const { testId, answers } = schema.parse(input);

  const test = await db.listeningTest.findUnique({
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

    if (q.type === "MCQ") isCorrect = userAnswer === correctAnswer.index;
    else if (q.type === "TRUE_FALSE") isCorrect = userAnswer === correctAnswer.value;

    details[q.id] = isCorrect;
    if (isCorrect) correct++;
  }

  const score = (correct / test.questions.length) * 100;

  await db.$transaction([
    db.attempt.create({
      data: {
        userId: session.user.id,
        skill: Skill.LISTENING,
        refId: testId,
        rawAnswer: answers as Prisma.InputJsonValue,
        score,
        feedback: { details } as Prisma.InputJsonValue,
      },
    }),
    db.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: Math.round(score / 10) }, lastActiveAt: new Date() },
    }),
  ]);

  return { ok: true, result: { score, details } };
}
