import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Trash2, Clock, Mail, RotateCcw, Eye } from "lucide-react";
import { updateFeedbackStatusAction, deleteFeedbackAction } from "@/server/actions/feedback";
import type { FeedbackCategory, FeedbackStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_META: Record<FeedbackStatus, { label: string; cls: string }> = {
  NEW: { label: "Mới", cls: "bg-amber-100 text-amber-700" },
  IN_REVIEW: { label: "Đang xử lý", cls: "bg-sky-100 text-sky-700" },
  RESOLVED: { label: "Đã xử lý", cls: "bg-emerald-100 text-emerald-700" },
};

const CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  SUGGESTION: "Góp ý / đề xuất",
  BUG: "Báo lỗi",
  QUESTION: "Câu hỏi / hỗ trợ",
  CONTENT: "Nội dung bài học",
  OTHER: "Khác",
};

async function loadFeedbacks() {
  return db.feedback.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
    include: { user: { select: { name: true, email: true } } },
  });
}

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const items = await loadFeedbacks();

  const pending = items.filter((f) => f.status !== "RESOLVED");
  const resolved = items.filter((f) => f.status === "RESOLVED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Liên hệ &amp; Góp ý</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Góp ý, báo lỗi và câu hỏi học viên gửi từ trang Liên hệ &amp; Góp ý.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Clock className="h-4 w-4" /> Chưa xử lý ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Không có góp ý nào đang chờ. 🎉
          </p>
        )}
        {pending.map((f) => (
          <FeedbackCard key={f.id} item={f} />
        ))}
      </section>

      {resolved.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Đã xử lý ({resolved.length})</h2>
          {resolved.map((f) => (
            <FeedbackCard key={f.id} item={f} />
          ))}
        </section>
      )}
    </div>
  );
}

type FeedbackWithUser = Awaited<ReturnType<typeof loadFeedbacks>>[number];

function FeedbackCard({ item: f }: { item: FeedbackWithUser }) {
  const meta = STATUS_META[f.status];
  const account = f.user.name ?? f.user.email?.split("@")[0] ?? "Học viên";

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {CATEGORY_LABEL[f.category]}
          </Badge>
          {f.subject && <span className="text-sm font-semibold">{f.subject}</span>}
          <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${meta.cls}`}>
            {meta.label}
          </span>
        </div>

        <p className="whitespace-pre-line rounded-lg bg-muted/60 p-2.5 text-sm">{f.message}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Tài khoản: {account}</span>
          {f.contactEmail && (
            <a href={`mailto:${f.contactEmail}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Mail className="h-3 w-3" /> {f.contactEmail}
            </a>
          )}
          <span>· {new Date(f.createdAt).toLocaleString("vi-VN")}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {f.status !== "IN_REVIEW" && f.status !== "RESOLVED" && (
            <form
              action={async () => {
                "use server";
                await updateFeedbackStatusAction({ id: f.id, status: "IN_REVIEW" });
              }}
            >
              <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                <Eye className="h-4 w-4" /> Đang xử lý
              </Button>
            </form>
          )}
          {f.status !== "RESOLVED" && (
            <form
              action={async () => {
                "use server";
                await updateFeedbackStatusAction({ id: f.id, status: "RESOLVED" });
              }}
            >
              <Button size="sm" type="submit" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <Check className="h-4 w-4" /> Đánh dấu đã xử lý
              </Button>
            </form>
          )}
          {f.status === "RESOLVED" && (
            <form
              action={async () => {
                "use server";
                await updateFeedbackStatusAction({ id: f.id, status: "NEW" });
              }}
            >
              <Button size="sm" type="submit" variant="outline" className="gap-1.5">
                <RotateCcw className="h-4 w-4" /> Mở lại
              </Button>
            </form>
          )}
          <form
            action={async () => {
              "use server";
              await deleteFeedbackAction(f.id);
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
