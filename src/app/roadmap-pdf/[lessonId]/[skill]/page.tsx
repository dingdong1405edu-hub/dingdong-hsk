import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { loadRoadmapPayload } from "@/server/pdf-payload";
import { PdfPreviewClient } from "@/components/learn/pdf/pdf-preview-client";

interface Props {
  params: Promise<{ lessonId: string; skill: string }>;
}

/** Trang xem trước PDF cho MỘT phần kỹ năng trong lộ trình (chặn theo gói như trang chơi). */
export default async function RoadmapPdfPreviewPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { lessonId, skill } = await params;

  const r = await loadRoadmapPayload(lessonId, skill, session.user.id, (session.user as { role?: string }).role);
  if (r.status === "locked") redirect(r.backHref);
  if (r.status !== "ok") notFound();

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <PdfPreviewClient
        payload={r.payload}
        downloadBase={`/api/pdf/roadmap/${lessonId}/${skill.toLowerCase()}`}
        backHref={r.backHref ?? "/roadmap"}
      />
    </div>
  );
}
