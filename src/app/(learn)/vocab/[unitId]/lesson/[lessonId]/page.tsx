import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { LessonClient } from "./lesson-client";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

export default async function VocabLessonPage({ params }: Props) {
  const { unitId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [lesson, user] = await Promise.all([
    db.vocabLesson.findUnique({ where: { id: lessonId }, include: { unit: true } }),
    db.user.findUnique({ where: { id: session.user.id }, select: { hearts: true } }),
  ]);
  if (!lesson || !user) notFound();

  return (
    <LessonClient
      lesson={lesson}
      unitId={unitId}
      hearts={user.hearts}
      skill="vocab"
    />
  );
}
