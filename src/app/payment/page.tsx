import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { PAYMENT_PLANS } from "@/lib/payment-plans";
import { isPayosConfigured } from "@/lib/payos";
import { PaymentClient } from "./payment-client";

export const metadata: Metadata = {
  title: "Thanh toán — DingDong HSK",
  description: "Nâng cấp tài khoản DingDong HSK để mở khoá toàn bộ tính năng học tiếng Trung.",
};

export const dynamic = "force-dynamic";

export default async function PaymentPage() {
  const session = await auth();

  return (
    <PaymentClient
      plans={PAYMENT_PLANS}
      configured={isPayosConfigured()}
      defaultName={session?.user?.name ?? ""}
      defaultEmail={session?.user?.email ?? ""}
    />
  );
}
