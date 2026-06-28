import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { loadSpeakingPayload } from "@/server/pdf-payload";
import { PdfPreviewClient } from "@/components/learn/pdf/pdf-preview-client";

interface Props {
  params: Promise<{ setId: string }>;
}

export default async function SpeakingPdfPreviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { setId } = await params;
  const r = await loadSpeakingPayload(setId);
  if (r.status !== "ok") notFound();
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <PdfPreviewClient payload={r.payload} downloadBase={`/api/pdf/speaking/${setId}`} backHref="/speaking" />
    </div>
  );
}
