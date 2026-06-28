import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { loadReadingPayload } from "@/server/pdf-payload";
import { PdfPreviewClient } from "@/components/learn/pdf/pdf-preview-client";

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function ReadingPdfPreviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { testId } = await params;
  const r = await loadReadingPayload(testId);
  if (r.status !== "ok") notFound();
  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <PdfPreviewClient payload={r.payload} downloadBase={`/api/pdf/reading/${testId}`} backHref="/reading" />
    </div>
  );
}
