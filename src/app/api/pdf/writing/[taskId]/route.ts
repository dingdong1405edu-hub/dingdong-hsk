import { createElement } from "react";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { WritingPdf } from "@/components/learn/writing/writing-pdf";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";
import type { WritingTaskType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<WritingTaskType, string> = {
  FREE: "Viết tự do",
  GUIDED: "Viết theo gợi ý",
  PICTURE_DESCRIPTION: "Mô tả tranh",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { taskId } = await params;

  const task = await db.writingTask.findUnique({ where: { id: taskId } });
  if (!task || !task.published) return pdfNotFound();

  const shortPrompt = task.prompt.length > 60 ? task.prompt.slice(0, 60) + "…" : task.prompt;

  try {
    return await renderPdfResponse(
      createElement(WritingPdf, {
        title: shortPrompt || "Bài viết",
        taskTypeLabel: TYPE_LABEL[task.taskType],
        hskLevel: task.hskLevel,
        prompt: task.prompt,
        promptZh: task.promptZh,
        outline: task.outline,
        minChars: task.minChars,
        timeLimit: task.timeLimit,
      }),
      `DingDong HSK - Viet - ${shortPrompt || task.id}`,
    );
  } catch (err) {
    return pdfError(err);
  }
}
