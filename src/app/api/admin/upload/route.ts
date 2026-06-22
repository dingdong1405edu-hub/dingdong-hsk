import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { storeUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Detect the real image type from the leading bytes (magic numbers) — the
 * client-supplied Content-Type is never trusted. SVG is intentionally NOT
 * supported: it is an active document format and would be a stored same-origin
 * XSS risk when served from /public. Only raster formats are accepted.
 */
function sniffImage(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif"; // GIF8
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 16);
    if (brand.includes("avif") || brand.includes("avis")) return "avif";
  }
  return null;
}

/**
 * Admin-only image upload. Stores the bytes in Postgres (model Upload) and
 * returns a durable public path (e.g. `/api/files/<id>`), served by
 * `src/app/api/files/[id]/route.ts`.
 *
 * Lý do lưu DB thay vì public/: filesystem trên Railway là ephemeral nên file
 * ghi vào public/ biến mất sau mỗi lần deploy/restart. Lưu DB thì bền vĩnh viễn.
 * Form admin vẫn nhận được URL dán tay (https/CDN) làm phương án thay thế.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Không có quyền truy cập" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Dữ liệu tải lên không hợp lệ" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Không tìm thấy tệp ảnh" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Ảnh vượt quá 5MB" }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = sniffImage(buf);
    if (!ext) {
      return NextResponse.json(
        { ok: false, error: "Tệp không phải ảnh hợp lệ (chỉ JPG, PNG, WEBP, GIF, AVIF)" },
        { status: 400 },
      );
    }
    const url = await storeUpload(buf, ext, "image");
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("Image upload error:", e);
    return NextResponse.json({ ok: false, error: "Lỗi lưu ảnh trên máy chủ" }, { status: 500 });
  }
}
