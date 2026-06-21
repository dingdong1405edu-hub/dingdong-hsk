"use server";
import crypto from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/payment-plans";
import { createPaymentLink, isPayosConfigured } from "@/lib/payos";

const schema = z.object({
  planId: z.string().min(1),
  buyerName: z.string().trim().max(100).optional(),
  buyerEmail: z.string().trim().max(200).optional(),
});

type CreateResult = { ok: true; checkoutUrl: string } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Origin tuyệt đối của site (cho returnUrl/cancelUrl gửi sang PayOS). */
async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createPaymentOrder(input: z.infer<typeof schema>): Promise<CreateResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ." };

  if (!isPayosConfigured()) {
    return { ok: false, error: "Cổng thanh toán PayOS chưa được cấu hình. Vui lòng thử lại sau." };
  }

  const plan = getPlan(parsed.data.planId);
  if (!plan) return { ok: false, error: "Gói thanh toán không tồn tại." };
  if (!Number.isInteger(plan.amount) || plan.amount < 1000) {
    return { ok: false, error: "Cấu hình giá gói không hợp lệ." };
  }

  // Quyền lợi gắn với TÀI KHOẢN → bắt buộc đăng nhập để mua.
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Vui lòng đăng nhập để mua gói." };
  }
  const userId = session.user.id;

  const nameRaw = (parsed.data.buyerName || session?.user?.name || "").trim();
  const buyerName = nameRaw || undefined;
  const emailRaw = (parsed.data.buyerEmail || session?.user?.email || "").trim();
  const buyerEmail = EMAIL_RE.test(emailRaw) ? emailRaw : undefined;

  const origin = await getOrigin();

  // Ghi đơn PENDING trước để webhook (có thể tới trước cả response) luôn có bản
  // ghi để cập nhật. Sinh orderCode duy nhất, ≤ 9_007_199_254_740_991 (giới hạn
  // PayOS = 2^53-1). timestamp(ms)*1000 ≈ 1.75e15, còn dư so với trần; phần dư
  // (crypto.randomInt 0..999) chống trùng trong cùng mili-giây. Nếu vẫn trùng
  // (P2002) thì thử lại với mã khác — không bao giờ đụng đơn của người khác.
  let order: Awaited<ReturnType<typeof db.payment.create>> | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCode = Date.now() * 1000 + crypto.randomInt(0, 1000);
    try {
      order = await db.payment.create({
        data: {
          orderCode: BigInt(orderCode),
          userId,
          amount: plan.amount,
          description: plan.code.slice(0, 25),
          planId: plan.id,
          planName: plan.name,
          status: "PENDING",
          buyerName,
          buyerEmail,
        },
      });
      break;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002" && attempt < 4) {
        continue; // orderCode trùng → thử mã khác
      }
      console.error("[payment] tạo đơn thất bại:", e);
      return { ok: false, error: "Không tạo được đơn hàng. Vui lòng thử lại." };
    }
  }
  if (!order) return { ok: false, error: "Không tạo được đơn hàng. Vui lòng thử lại." };

  // Từ đây mọi cập nhật đều theo order.id (đơn của chính request này) — không
  // bao giờ ghi đè theo orderCode lên đơn của người khác.
  try {
    const link = await createPaymentLink({
      orderCode: Number(order.orderCode),
      amount: plan.amount,
      description: plan.code,
      returnUrl: `${origin}/payment/success`,
      cancelUrl: `${origin}/payment/cancel`,
      buyerName,
      buyerEmail,
      items: [{ name: plan.name, quantity: 1, price: plan.amount }],
    });

    await db.payment.update({
      where: { id: order.id },
      data: { checkoutUrl: link.checkoutUrl, paymentLinkId: link.paymentLinkId },
    });

    return { ok: true, checkoutUrl: link.checkoutUrl };
  } catch (e) {
    console.error("[payment] createPaymentLink thất bại:", e);
    await db.payment
      .update({ where: { id: order.id }, data: { status: "FAILED" } })
      .catch(() => {
        /* bỏ qua lỗi phụ khi đánh dấu FAILED */
      });
    return { ok: false, error: "Không tạo được liên kết thanh toán. Vui lòng thử lại." };
  }
}
