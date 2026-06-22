import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { WritingPdf } from "@/components/learn/writing/writing-pdf";
import type { WritingTaskType } from "@prisma/client";

interface Props {
  params: Promise<{ taskId: string }>;
}

const TYPE_LABEL: Record<WritingTaskType, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết theo gợi ý",
  PICTURE_DESCRIPTION: "Mô tả tranh",
};

export default async function WritingPdfPage({ params }: Props) {
  const { taskId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const task = await db.writingTask.findUnique({ where: { id: taskId } });
  if (!task || !task.published) notFound();

  const label = TYPE_LABEL[task.taskType];
  const shortPrompt = task.prompt.length > 48 ? task.prompt.slice(0, 48) + "…" : task.prompt;

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <WritingPdf
        title={shortPrompt || "Bài viết"}
        taskTypeLabel={label}
        hskLevel={task.hskLevel}
        prompt={task.prompt}
        promptZh={task.promptZh}
        minChars={task.minChars}
        timeLimit={task.timeLimit}
        backHref="/writing"
      />
    </div>
  );
}
