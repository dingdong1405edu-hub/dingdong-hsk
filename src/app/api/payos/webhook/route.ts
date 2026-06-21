import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyWebhookSignature, type PayosWebhookBody } from "@/lib/payos";

// Node runtime (cần node:crypto trong verifyWebhookSignature).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: PayosWebhookBody;
  try {
    body = (await req.json()) as PayosWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Chữ ký không hợp lệ → từ chối (chống giả mạo). PayOS gửi payload ký hợp lệ
  // nên webhook thật & lần "xác nhận URL" đều qua được.
  if (!verifyWebhookSignature(body)) {
    console.warn("[payos webhook] chữ ký không hợp lệ");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const data = (body.data ?? {}) as {
    orderCode?: number | string;
    reference?: string;
    code?: string;
  };

  // Khi đăng ký Webhook URL, PayOS gửi 1 ping thử (orderCode 123) — ký hợp lệ
  // nhưng không khớp đơn nào. Ack để việc đăng ký thành công.
  if (data.orderCode === undefined || data.orderCode === null || data.orderCode === "") {
    return NextResponse.json({ success: true });
  }

  let orderCode: bigint;
  try {
    orderCode = BigInt(data.orderCode);
  } catch {
    return NextResponse.json({ success: true });
  }

  try {
    const existing = await db.payment.findUnique({ where: { orderCode } });
    if (!existing) {
      // Đơn lạ (vd ping đăng ký) — ack, không báo lỗi.
      return NextResponse.json({ success: true });
    }

    // Idempotent: đã PAID thì không ghi đè.
    if (existing.status === "PAID") {
      return NextResponse.json({ success: true });
    }

    const isPaid = body.code === "00" && data.code === "00";

    await db.payment.update({
      where: { orderCode },
      data: {
        status: isPaid ? "PAID" : "FAILED",
        reference: data.reference ?? null,
        paidAt: isPaid ? new Date() : null,
        rawWebhook: body as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    // Lỗi DB tạm thời trên webhook ĐÃ xác minh chữ ký: trả 503 để PayOS gửi lại
    // (thay vì 500 mờ mịt) và log để đối soát thủ công nếu cần.
    console.error(`[payos webhook] lỗi cập nhật đơn orderCode=${orderCode}:`, e);
    return NextResponse.json({ error: "Temporary error, please retry" }, { status: 503 });
  }
}
