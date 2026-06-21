import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { isPayosConfigured } from "@/lib/payos";
import { PaymentClient } from "./payment-client";

export const metadata: Metadata = {
  title: "Bảng giá & Thanh toán — DingDong HSK",
  description: "Chọn gói Lộ trình HSK hoặc Gói Tự do để mở khoá toàn bộ tính năng học tiếng Trung.",
};

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  return (
    <PaymentClient
      plans={PAYMENT_PLANS}
      configured={isPayosConfigured()}
      loggedIn={!!session?.user}
      defaultName={session?.user?.name ?? ""}
      defaultEmail={session?.user?.email ?? ""}
      initialPlanId={sp.plan ?? null}
    />
  );
}
