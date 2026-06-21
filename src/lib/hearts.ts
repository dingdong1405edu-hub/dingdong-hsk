// Hệ thống TIM (heart) kiểu Duolingo cho người dùng MIỄN PHÍ.
//  • Tối đa MAX_HEARTS; mỗi câu sai mất 1 tim.
//  • Tự hồi 1 tim mỗi HEART_REGEN_MINUTES phút (tính theo heartsUpdatedAt).
//  • Hết tim → chặn luyện tập (tính năng tự do) cho tới khi hồi/được tặng.
//  • "Tặng tim": hoàn thành bài không sai nào → +1 tim (xem completeLessonAction).
//  • Người trả phí / admin → tim KHÔNG GIỚI HẠN (bỏ qua mọi giới hạn ở đây).
// Không chứa secret, dùng được ở cả client lẫn server.

export const MAX_HEARTS = 5;
export const HEART_REGEN_MINUTES = 30;

const REGEN_MS = HEART_REGEN_MINUTES * 60 * 1000;

/**
 * Số tim THỰC TẾ hiện tại = tim đã lưu + số tim hồi được từ heartsUpdatedAt đến
 * `now`, kẹp trong [0, MAX_HEARTS]. Dùng cho cả hiển thị lẫn lúc trừ tim.
 */
export function effectiveHearts(
  hearts: number,
  heartsUpdatedAt: Date | null | undefined,
  now: Date = new Date()
): number {
  const base = Math.max(0, Math.min(MAX_HEARTS, hearts));
  if (base >= MAX_HEARTS || !heartsUpdatedAt) return base;
  const elapsed = now.getTime() - heartsUpdatedAt.getTime();
  if (elapsed <= 0) return base;
  const regen = Math.floor(elapsed / REGEN_MS);
  return Math.min(MAX_HEARTS, base + regen);
}

/**
 * Số mili-giây tới khi hồi thêm 1 tim (để hiển thị đồng hồ đếm ngược), hoặc
 * null nếu đã đầy / chưa có mốc hồi.
 */
export function msUntilNextHeart(
  hearts: number,
  heartsUpdatedAt: Date | null | undefined,
  now: Date = new Date()
): number | null {
  if (!heartsUpdatedAt) return null;
  if (effectiveHearts(hearts, heartsUpdatedAt, now) >= MAX_HEARTS) return null;
  const elapsed = now.getTime() - heartsUpdatedAt.getTime();
  const intoCurrent = ((elapsed % REGEN_MS) + REGEN_MS) % REGEN_MS;
  return REGEN_MS - intoCurrent;
}
