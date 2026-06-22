import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * Phục vụ tệp lưu trong DB (model Upload): ảnh minh hoạ & audio bài nghe.
 * Trả về đúng Content-Type đã lưu, cache vĩnh viễn (id là cuid bất biến nên nội
 * dung không đổi), và `nosniff` để trình duyệt không tự suy diễn kiểu tệp.
 * Đây là thay thế cho việc serve file tĩnh từ public/ (ephemeral trên Railway).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await db.upload.findUnique({ where: { id } });
  if (!file) {
    return new Response("Not found", { status: 404 });
  }
  // Bọc trong Uint8Array để kiểu Buffer (Buffer<ArrayBufferLike>) hợp lệ với
  // BodyInit trên mọi phiên bản @types/node.
  const body = new Uint8Array(file.data);
  return new Response(body, {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
