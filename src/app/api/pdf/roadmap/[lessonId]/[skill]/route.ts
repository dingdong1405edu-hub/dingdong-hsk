import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadRoadmapPayload } from "@/server/pdf-payload";
import { payloadToElement } from "@/components/learn/pdf/payload";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ lessonId: string; skill: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { lessonId, skill } = await params;

  const r = await loadRoadmapPayload(lessonId, skill, session.user.id, (session.user as { role?: string }).role);
  if (r.status === "locked") return new Response("Bài học đã khoá — mở khoá lộ trình để tải PDF.", { status: 403 });
  if (r.status !== "ok") return pdfNotFound();

  try {
    return await renderPdfResponse(payloadToElement(r.payload, req.nextUrl.searchParams.get("scope")), r.fileName);
  } catch (err) {
    return pdfError(err);
  }
}
