import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { WritingClient } from "./writing-client";

interface Props {
  params: Promise<{ taskId: string }>;
}

export default async function WritingTaskPage({ params }: Props) {
  const { taskId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const task = await db.writingTask.findUnique({ where: { id: taskId } });
  if (!task || !task.published) notFound(); // chặn truy cập trực tiếp đề nháp

  return <WritingClient task={task} userId={session.user.id} />;
}
