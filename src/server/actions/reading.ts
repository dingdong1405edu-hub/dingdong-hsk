"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Skill, Prisma } from "@prisma/client";

const submitSchema = z.object({
  testId: z.string(),
  answers: z.record(z.unknown()),
  durationSec: z.number().int().nonnegative().optional(),
});

/** Normalize a free-text answer: NFKC (fold full/half-width from Chinese IMEs), drop whitespace, lowercase. */
function normalize(v: unknown): string {
  return String(v ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

export async function submitReadingAction(input: z.infer<typeof submitSchema>) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const { testId, answers, durationSec } = submitSchema.parse(input);

  const test = await db.readingTest.findUnique({
    where: { id: testId },
    include: { questions: true },
  });
  if (!test) return { ok: false, error: "Test not found" };

  const details: Record<string, boolean> = {};
  let correct = 0;

  for (const q of test.questions) {
    const userAnswer = answers[q.id];
    const correctAnswer = q.correctAnswer as {
      index?: number;
      value?: boolean;
      text?: string;
      accepted?: string[];
    };
    let isCorrect = false;

    if (q.type === "MCQ") {
      isCorrect = typeof correctAnswer.index === "number" && userAnswer === correctAnswer.index;
    } else if (q.type === "TRUE_FALSE") {
      // Guard against a malformed row (value undefined) matching an unanswered question.
      isCorrect = typeof correctAnswer.value === "boolean" && userAnswer === correctAnswer.value;
    } else if (q.type === "FILL_BLANK" || q.type === "SHORT_ANSWER") {
      // Accept any of the listed answers (or the single `text`), whitespace/case-insensitive.
      const accepted = [
        ...(correctAnswer.text ? [correctAnswer.text] : []),
        ...(Array.isArray(correctAnswer.accepted) ? correctAnswer.accepted : []),
      ].map(normalize);
      const ua = normalize(userAnswer);
      isCorrect = ua.length > 0 && accepted.includes(ua);
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
          durationSec: durationSec ?? null,
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
