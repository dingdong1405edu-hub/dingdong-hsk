import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Trash2, Flag, MessageSquare, Clock } from "lucide-react";
import { moderateWordReportAction, deleteWordReportAction } from "@/server/actions/word-report";
import type { WordReportStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_META: Record<WordReportStatus, { label: string; cls: string }> = {
  PENDING: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Đã duyệt", cls: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Đã từ chối", cls: "bg-zinc-100 text-zinc-600" },
};

export default async function AdminWordReportsPage() {
  await requireAdmin();
  const reports = await db.wordReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: {
      word: { select: { hanzi: true, pinyin: true, meaning: true, lessonId: true } },
      user: { select: { name: true, email: true } },
    },
  });

  const pending = reports.filter((r) => r.status === "PENDING");
  const handled = reports.filter((r) => r.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Phản ánh từ vựng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Học viên báo lỗi hoặc bình luận về từ. Duyệt để bình luận hiển thị công khai cho mọi người.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" /> Chờ duyệt ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Không có phản ánh nào đang chờ.
          </p>
        )}
        {pending.map((r) => (
          <ReportCard key={r.id} report={r} />
        ))}
      </section>

      {handled.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Đã xử lý ({handled.length})</h2>
          {handled.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </section>
      )}
    </div>
  );
}

type ReportWithRel = Awaited<ReturnType<typeof loadReports>>[number];
async function loadReports() {
  return db.wordReport.findMany({
    include: {
      word: { select: { hanzi: true, pinyin: true, meaning: true, lessonId: true } },
      user: { select: { name: true, email: true } },
    },
  });
}

function ReportCard({ report: r }: { report: ReportWithRel }) {
  const meta = STATUS_META[r.status];
  const author = r.user.name ?? r.user.email?.split("@")[0] ?? "Học viên";
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-chinese text-2xl font-bold">{r.word.hanzi}</span>
          <span className="font-pinyin text-sm text-muted-foreground">{r.word.pinyin}</span>
          <span className="text-sm">· {r.word.meaning}</span>
          <Badge variant="secondary" className="ml-auto gap-1 text-xs">
            {r.kind === "ERROR" ? <Flag className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
            {r.kind === "ERROR" ? "Báo lỗi" : "Bình luận"}
          </Badge>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>{meta.label}</span>
        </div>

        <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2.5 text-sm">{r.content}</p>
        <div className="text-xs text-muted-foreground">
          {author} · {new Date(r.createdAt).toLocaleString("vi-VN")}
        </div>

        <div className="flex flex-wrap gap-2">
          {r.status !== "APPROVED" && (
            <form
              action={async () => {
                "use server";
                await moderateWordReportAction({ id: r.id, status: "APPROVED" });
              }}
            >
              <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Duyệt (hiện công khai)
              </Button>
            </form>
          )}
          {r.status !== "REJECTED" && (
            <form
              action={async () => {
                "use server";
                await moderateWordReportAction({ id: r.id, status: "REJECTED" });
              }}
            >
              <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                <X className="h-4 w-4" /> Từ chối / ẩn
              </Button>
            </form>
          )}
          <form
            action={async () => {
              "use server";
              await deleteWordReportAction(r.id);
            }}
          >
            <Button size="sm" type="submit" variant="ghost" className="gap-1.5 text-destructive">
              <Trash2 className="h-4 w-4" /> Xoá
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
