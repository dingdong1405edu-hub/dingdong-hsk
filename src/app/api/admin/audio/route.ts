import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { storeUpload } from "@/lib/uploads";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024; // 20MB — generous for a listening clip

/**
 * Detect a supported audio container from leading bytes (the client-supplied
 * Content-Type is never trusted). Returns the canonical extension or null.
 */
function sniffAudio(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  // ID3v2-tagged MP3 ("ID3")
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return "mp3";
  // Raw MPEG audio frame sync (11 bits set): 0xFF, then top 3 bits of next byte
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return "mp3";
  // RIFF/WAVE
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WAVE") return "wav";
  // OGG
  if (buf.toString("ascii", 0, 4) === "OggS") return "ogg";
  // ISO-BMFF (m4a / mp4 audio)
  if (buf.toString("ascii", 4, 8) === "ftyp") return "m4a";
  return null;
}

/**
 * Admin-only listening audio upload. One multipart POST with `file` → lưu một
 * tệp audio có sẵn (mp3/wav/ogg/m4a). Trả `{ ok, url }` với url là
 * `/api/files/<id>` (phục vụ từ Postgres).
 *
 * Lý do lưu DB thay vì public/: filesystem trên Railway là ephemeral nên file
 * ghi vào public/ biến mất sau mỗi lần deploy/restart. Lưu DB thì bền vĩnh viễn.
 * Form admin vẫn nhận được URL dán tay (https/CDN) làm phương án thay thế.
 *
 * (Không còn tạo MP3 bằng AI — admin tự tải audio thật lên; xem CLAUDE.md §2.)
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

  // ----- File upload -----
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "Tệp âm thanh vượt quá 20MB" }, { status: 400 });
    }
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const ext = sniffAudio(buf);
      if (!ext) {
        return NextResponse.json(
          { ok: false, error: "Tệp không phải âm thanh hợp lệ (chỉ MP3, WAV, OGG, M4A)" },
          { status: 400 },
        );
      }
      const url = await storeUpload(buf, ext, "audio");
      return NextResponse.json({ ok: true, url });
    } catch (e) {
      console.error("Audio upload error:", e);
      return NextResponse.json({ ok: false, error: "Lỗi lưu tệp âm thanh trên máy chủ" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { ok: false, error: "Thiếu tệp âm thanh để tải lên." },
    { status: 400 },
  );
}
