// Lưu tệp admin tải lên / sinh ra THẲNG trong Postgres (model Upload) thay vì
// ghi vào public/. Lý do: filesystem Railway là ephemeral — file trong public/
// biến mất sau mỗi lần deploy/restart, khiến ảnh & audio "không lưu được".
// Phục vụ lại qua /api/files/[id]. Xem prisma/schema.prisma > model Upload.
import { db } from "@/lib/db";

/** Đuôi tệp chuẩn hoá → MIME type để serve đúng Content-Type. */
const MIME_BY_EXT: Record<string, string> = {
  // ảnh
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  // audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",
};

export function mimeForExt(ext: string): string {
  return MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";
}

/**
 * Lưu tệp vào DB và trả về đường dẫn công khai `/api/files/<id>` để gắn vào
 * imageUrl / audioUrl. `kind` chỉ để phân loại (không ảnh hưởng cách serve).
 */
export async function storeUpload(
  buf: Buffer,
  ext: string,
  kind: "image" | "audio",
): Promise<string> {
  const rec = await db.upload.create({
    data: {
      mime: mimeForExt(ext),
      ext: ext.toLowerCase(),
      size: buf.length,
      kind,
      // Bọc trong Uint8Array để khớp kiểu Bytes của Prisma (Uint8Array<ArrayBuffer>),
      // Buffer<ArrayBufferLike> không gán trực tiếp được.
      data: new Uint8Array(buf),
    },
    select: { id: true },
  });
  return `/api/files/${rec.id}`;
}
