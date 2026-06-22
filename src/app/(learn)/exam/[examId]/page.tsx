import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { MockExamClient } from "./mock-exam-client";
import type { ExamData } from "./types";

interface Props {
  params: Promise<{ examId: string }>;
}

export default async function MockExamPage({ params }: Props) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

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
  if (!exam) notFound();

  // Đề nháp chỉ admin xem được (chặn học viên truy cập trực tiếp qua URL).
  if (!exam.published && session.user.role !== "ADMIN") notFound();

  const data: ExamData = {
    id: exam.id,
    title: exam.title,
    titleZh: exam.titleZh,
    hskLevel: exam.hskLevel,
    description: exam.description,
    totalTime: exam.totalTime,
    sections: exam.sections.map((s) => ({
      id: s.id,
      skill: s.skill,
      title: s.title,
      instructions: s.instructions,
      parts: s.parts.map((p) => ({
        id: p.id,
        title: p.title,
        instructions: p.instructions,
        imageUrl: p.imageUrl,
        passage: p.passage,
        passagePinyin: p.passagePinyin,
        audioUrl: p.audioUrl,
        transcript: p.transcript,
        writingPrompt: p.writingPrompt,
        writingMinChars: p.writingMinChars,
        questions: p.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          promptPinyin: q.promptPinyin,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          supportingQuote: q.supportingQuote,
          order: q.order,
        })),
      })),
    })),
  };

  return <MockExamClient exam={data} />;
}
