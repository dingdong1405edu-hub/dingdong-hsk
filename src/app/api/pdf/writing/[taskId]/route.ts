import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadWritingPayload } from "@/server/pdf-payload";
import { payloadToElement } from "@/components/learn/pdf/payload";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { taskId } = await params;
  const r = await loadWritingPayload(taskId);
  if (r.status !== "ok") return pdfNotFound();
  try {
    return await renderPdfResponse(payloadToElement(r.payload), r.fileName);
  } catch (err) {
    return pdfError(err);
  }
}
