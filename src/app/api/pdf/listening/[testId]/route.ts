import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { loadListeningPayload } from "@/server/pdf-payload";
import { payloadToElement } from "@/components/learn/pdf/payload";
import { renderPdfResponse } from "@/lib/pdf/render";
import { pdfError, pdfNotFound, pdfUnauthorized } from "@/lib/pdf/responses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ testId: string }> }) {
  const session = await auth();
  if (!session?.user) return pdfUnauthorized();
  const { testId } = await params;
  const r = await loadListeningPayload(testId);
  if (r.status !== "ok") return pdfNotFound();
  try {
    return await renderPdfResponse(payloadToElement(r.payload, req.nextUrl.searchParams.get("scope")), r.fileName);
  } catch (err) {
    return pdfError(err);
  }
}
