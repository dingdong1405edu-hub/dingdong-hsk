import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { GrantSubscriptionForm } from "@/components/admin/grant-subscription-form";

export const dynamic = "force-dynamic";

export default async function AdminSubscriptionsPage() {
  const subs = await db.subscription.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  const planOptions = PAYMENT_PLANS.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gói & Quyền lợi</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cấp gói thủ công cho một tài khoản (vd để tặng, đối soát, hoặc trước khi PayOS hoạt động)
          và xem các quyền lợi còn hạn. Tài khoản ADMIN luôn được mở hết tất cả.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cấp gói cho người dùng</CardTitle>
        </CardHeader>
        <CardContent>
          <GrantSubscriptionForm plans={planOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quyền lợi đang còn hạn ({subs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Chưa có quyền lợi nào còn hạn.
            </p>
          ) : (
            <div className="divide-y">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.user?.name ?? s.user?.email ?? "—"}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.user?.email}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                      {s.type === "ROADMAP" ? `Lộ trình ${s.hskLevel ?? ""}`.trim() : "Tự do"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      đến {new Date(s.expiresAt).toLocaleDateString("vi")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
