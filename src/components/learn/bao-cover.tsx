import { cn } from "@/lib/utils";

/**
 * BaoCover — ảnh đại diện DỰ PHÒNG cho các thẻ (bài học / tài liệu) chưa có ảnh riêng.
 *
 * Hiện ảnh linh vật Bao (bánh bao trong lồng hấp) phủ kín ô để thẻ đỡ trống, hành xử
 * y như một ảnh cover thật (object-cover). Thuần trang trí → `aria-hidden` để trình đọc
 * màn hình không đọc lặp (thẻ đã có tiêu đề riêng ở <h3>).
 *
 * Kích thước ô do phía gọi quyết định qua `className`
 * (vd `absolute inset-0` hoặc `h-32 w-full rounded-xl`).
 */
export function BaoCover({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden bg-[#f4e8cf] dark:bg-amber-500/10", className)}
    >
      {/* Ảnh tĩnh trong /public → dùng <img> thường cho gọn (không cần cấu hình next/image). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bao-cover.png"
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  );
}
