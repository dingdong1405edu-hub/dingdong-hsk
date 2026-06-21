import Link from "next/link";
import { CheckCircle2, Clock, Home, LayoutDashboard } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatVnd } from "@/lib/payment-plans";

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderCode?: string; status?: string; code?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();

  // Chỉ hiển thị CHI TIẾT đơn cho chính chủ (đăng nhập & khớp userId) để tránh lộ
  // thông tin đơn của người khác qua việc đoán orderCode (IDOR). Khách vãng lai
  // (đơn không gắn tài khoản) vẫn thấy thông báo thành công từ query của PayOS.
  let payment: Awaited<ReturnType<typeof db.payment.findUnique>> = null;
  if (sp.orderCode && /^\d+$/.test(sp.orderCode) && session?.user?.id) {
    try {
      const found = await db.payment.findUnique({ where: { orderCode: BigInt(sp.orderCode) } });
      if (found && found.userId === session.user.id) payment = found;
    } catch {
      payment = null;
    }
  }

  // PayOS trả về ?status=PAID&code=00 khi thành công. DB cập nhật PAID qua webhook
  // (có thể trễ vài giây) → coi là "đang xác nhận" nếu DB chưa kịp.
  const paidByDb = payment?.status === "PAID";
  const paidByQuery = sp.code === "00" && sp.status === "PAID";
  const paid = paidByDb || paidByQuery;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-soft">
        {paid ? (
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
        ) : (
          <Clock className="mx-auto h-16 w-16 text-amber-500" />
        )}

        <h1 className="mt-5 text-2xl font-bold">
          {paid ? "Thanh toán thành công!" : "Đang xác nhận thanh toán…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? "Cảm ơn bạn đã ủng hộ DingDong HSK. Đơn hàng của bạn đã được ghi nhận."
            : "Chúng tôi đã nhận yêu cầu và đang chờ xác nhận từ ngân hàng. Trạng thái sẽ cập nhật trong giây lát."}
        </p>

        {payment && (
          <div className="mt-6 space-y-2 rounded-lg bg-muted/60 p-4 text-left text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Gói</span>
              <span className="font-medium">{payment.planName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Số tiền</span>
              <span className="font-semibold">{formatVnd(payment.amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Mã đơn</span>
              <span className="font-mono text-xs">{payment.orderCode.toString()}</span>
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">
              <Home className="h-4 w-4" /> Trang chủ
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" /> Vào học
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
