import Link from "next/link";
import { XCircle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PaymentCancelPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center shadow-soft">
        <XCircle className="mx-auto h-16 w-16 text-rose-500" />

        <h1 className="mt-5 text-2xl font-bold">Đã huỷ thanh toán</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Giao dịch chưa được hoàn tất. Bạn không bị trừ tiền. Có thể thử lại bất cứ lúc nào.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="flex-1">
            <Link href="/">
              <Home className="h-4 w-4" /> Trang chủ
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href="/payment">
              <RotateCcw className="h-4 w-4" /> Thử lại
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
