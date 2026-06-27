import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Logo thương hiệu dạng data-URI để nhúng thẳng vào HTML khi tạo PDF.
 *
 * PDF tạo bằng `page.setContent(html)` nên KHÔNG có base URL → đường dẫn tương đối
 * như "/logo-hsk.png" sẽ không tải được. Đọc file 1 lần từ public/ rồi cache lại
 * thành base64. Chỉ chạy ở server (Node) trong route handler /api/pdf/*.
 */
let cached: string | null = null;

export function getLogoDataUri(): string {
  if (cached) return cached;
  try {
    const buf = readFileSync(join(process.cwd(), "public", "logo-hsk.png"));
    cached = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    // Thiếu file → trả chuỗi rỗng; header PDF vẫn hiện chữ "DingDong HSK".
    cached = "";
  }
  return cached;
}
