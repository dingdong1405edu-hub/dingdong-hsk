import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { loadVocabPayload } from "@/server/pdf-payload";
import { PdfPreviewClient } from "@/components/learn/pdf/pdf-preview-client";

interface Props {
  params: Promise<{ unitId: string; lessonId: string }>;
}

export default async function VocabPdfPreviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { unitId, lessonId } = await params;
  const r = await loadVocabPayload(lessonId);
  if (r.status !== "ok") notFound();
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <PdfPreviewClient payload={r.payload} downloadBase={`/api/pdf/vocab/${unitId}/${lessonId}`} backHref={`/vocab/${unitId}`} />
    </div>
  );
}
