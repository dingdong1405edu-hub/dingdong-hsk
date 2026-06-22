import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/admin-guard";

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
 * Admin-only image upload. Stores files under `public/images/uploads/` and
 * returns a public path (e.g. `/images/uploads/<uuid>.webp`).
 *
 * NOTE (deploy): on an ephemeral filesystem (Railway without a mounted volume)
 * these files do not survive a redeploy. Mount a volume at
 * `/app/public/images/uploads` or swap this for R2 to make them durable. The
 * admin form also accepts a pasted URL for fully durable storage.
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
    const dir = path.join(process.cwd(), "public", "images", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(dir, filename), buf);
    return NextResponse.json({ ok: true, url: `/images/uploads/${filename}` });
  } catch (e) {
    console.error("Image upload error:", e);
    return NextResponse.json({ ok: false, error: "Lỗi lưu ảnh trên máy chủ" }, { status: 500 });
  }
}
