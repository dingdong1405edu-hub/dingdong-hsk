import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isChatConfigured, streamBaoReply, type ChatMessage } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

/**
 * Trợ lý chat "Bao". Yêu cầu đăng nhập (mọi học viên đều dùng được, miễn phí —
 * không trừ tim, không cần gói trả phí). Trả về stream text/plain để câu trả lời
 * hiện dần trên giao diện.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Cần đăng nhập để dùng trợ lý." }, { status: 401 });
  }

  if (!isChatConfigured()) {
    return NextResponse.json(
      { error: "Trợ lý AI chưa được cấu hình (thiếu GROQ_API_KEY)." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // Chỉ giữ 20 lượt gần nhất (đủ ngữ cảnh, gọn token). Lượt cuối phải là của người dùng.
  const messages = parsed.data.messages.slice(-20) as ChatMessage[];
  if (messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }

  // Lấy tên + trình độ HSK từ DB (không tin client) để cá nhân hoá câu trả lời.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, hskLevel: true },
  });

  try {
    const stream = await streamBaoReply({
      messages,
      hskLevel: user?.hskLevel ?? "HSK1",
      name: user?.name,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        // Tắt buffering của một số reverse-proxy để stream tới ngay.
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return NextResponse.json({ error: "Trợ lý AI tạm thời không phản hồi." }, { status: 500 });
  }
}
