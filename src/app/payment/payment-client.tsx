"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, Loader2, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatVnd, type PaymentPlan } from "@/lib/payment-plans";
import { createPaymentOrder } from "@/server/actions/payment";

interface Props {
  plans: PaymentPlan[];
  configured: boolean;
  defaultName: string;
  defaultEmail: string;
}

export function PaymentClient({ plans, configured, defaultName, defaultEmail }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBuy(planId: string) {
    if (!configured) {
      toast.error("Cổng thanh toán đang được hoàn tất cấu hình. Vui lòng quay lại sau.");
      return;
    }
    setPendingId(planId);
    startTransition(async () => {
      const res = await createPaymentOrder({
        planId,
        buyerName: name.trim() || undefined,
        buyerEmail: email.trim() || undefined,
      });
      if (res.ok) {
        // Chuyển sang trang thanh toán PayOS.
        window.location.href = res.checkoutUrl;
      } else {
        toast.error(res.error);
        setPendingId(null);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Về trang chủ
          </Link>
          <Logo className="mb-4 h-12 w-12" />
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Nâng cấp tài khoản
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Chọn gói của bạn</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Mở khoá toàn bộ hành trình chinh phục tiếng Trung cùng DingDong HSK. Thanh toán an toàn
            qua PayOS — chuyển khoản ngân hàng & QR.
          </p>
        </div>

        {!configured && (
          <div className="mx-auto mb-8 max-w-xl rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            Cổng thanh toán đang được hoàn tất cấu hình. Bạn vẫn xem được các gói, nút thanh toán sẽ
            hoạt động ngay khi hoàn tất.
          </div>
        )}

        {/* Thông tin người mua (tuỳ chọn) */}
        <div className="mx-auto mb-10 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="buyerName">Họ tên (tuỳ chọn)</Label>
            <Input
              id="buyerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="buyerEmail">Email (tuỳ chọn)</Label>
            <Input
              id="buyerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              autoComplete="email"
            />
          </div>
        </div>

        {/* Các gói */}
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const loading = isPending && pendingId === plan.id;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 shadow-soft transition-transform duration-200 hover:-translate-y-1",
                  plan.highlighted ? "border-primary shadow-soft-primary ring-1 ring-primary/30" : "border-border/70"
                )}
              >
                {plan.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 shadow">Phổ biến nhất</Badge>
                )}

                <h2 className="text-lg font-bold">{plan.name}</h2>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-extrabold tracking-tight">{formatVnd(plan.amount)}</span>
                  {plan.period && (
                    <span className="mb-1 text-sm font-medium text-muted-foreground">{plan.period}</span>
                  )}
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className="mt-6 w-full"
                  size="lg"
                  variant={plan.highlighted ? "default" : "outline"}
                  disabled={isPending || !configured}
                  onClick={() => handleBuy(plan.id)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo đơn…
                    </>
                  ) : (
                    "Thanh toán"
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Trust footer */}
        <div className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Thanh toán bảo mật qua PayOS · Thông tin thẻ/ngân hàng không lưu trên hệ thống của chúng tôi.
        </div>
      </div>
    </div>
  );
}
