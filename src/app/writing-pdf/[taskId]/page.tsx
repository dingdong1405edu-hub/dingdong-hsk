import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { loadWritingPayload } from "@/server/pdf-payload";
import { PdfPreviewClient } from "@/components/learn/pdf/pdf-preview-client";

interface Props {
  params: Promise<{ taskId: string }>;
}

export default async function WritingPdfPreviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { taskId } = await params;
  const r = await loadWritingPayload(taskId);
  if (r.status !== "ok") notFound();
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <PdfPreviewClient payload={r.payload} downloadBase={`/api/pdf/writing/${taskId}`} backHref="/writing" />
    </div>
  );
}
