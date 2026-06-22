// Thuật toán lặp lại ngắt quãng (spaced repetition) cho chế độ "Ôn từ".
//
// Lịch ôn được thiết kế theo yêu cầu sản phẩm — nhẹ nhàng, dễ đoán, leo thang
// dần (không nhân ×ease kiểu SM-2 thuần vì khoảng cách nhảy quá nhanh). Mỗi từ
// giữ một "bậc" (repetitions = số lần đạt liên tiếp) và một khoảng cách hiện tại.
// Hàm thuần (pure) nên dùng được ở cả server action và client component.
//
//   • Quên (again) → ~1 PHÚT, đặt lại bậc về 0 → quay lại học luôn trong phiên.
//   • Khó  (hard)  → 1 NGÀY (ghim ở mức thấp, không leo thang).
//   • Tốt  (good)  → 3 → 5 → 8 → 12 … ngày (theo bậc).
//   • Dễ   (easy)  → 5 → 7 → 10 → 15 … ngày (giãn nhanh hơn "Tốt").

export interface SrsState {
  repetitions: number; // số lần trả lời đạt (q>=3) liên tiếp — dùng làm "bậc"
  intervalDays: number; // khoảng cách hiện tại tính theo ngày (0 = dưới 1 ngày)
  ease: number; // easiness factor (>= 1.3) — giữ để tham khảo / tinh chỉnh sau
}

/** Trạng thái khởi đầu cho một từ chưa từng ôn. */
export const SRS_DEFAULT: SrsState = { repetitions: 0, intervalDays: 0, ease: 2.5 };

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Số phút hiện lại từ khi người học bấm "Quên". */
export const AGAIN_MINUTES = 1;

// Bậc thang khoảng cách (ngày) cho hai mức đạt. "Dễ" luôn giãn xa hơn "Tốt".
// Vượt quá độ dài bảng thì nhân nhẹ (×1.4) để vẫn tiếp tục giãn.
const GOOD_DAYS = [3, 5, 8, 12, 18, 27, 40, 60, 90, 135, 200, 300];
const EASY_DAYS = [5, 7, 10, 15, 21, 30, 45, 66, 99, 150, 225, 330];

function ladderValue(ladder: number[], step: number): number {
  // step là 1-based (bậc thứ mấy của chuỗi đạt).
  const idx = Math.max(0, step - 1);
  if (idx < ladder.length) return ladder[idx];
  const last = ladder[ladder.length - 1];
  return Math.round(last * Math.pow(1.4, idx - ladder.length + 1));
}

/** Mức tự đánh giá trên flashcard (giống Anki/Duolingo). */
export type SrsRating = "again" | "hard" | "good" | "easy";

/** Quy đổi mức tự đánh giá flashcard → điểm chất lượng SM-2 (0..5). */
export function ratingToQuality(rating: SrsRating): number {
  switch (rating) {
    case "again":
      return 2; // quên → coi là chưa đạt
    case "hard":
      return 3;
    case "good":
      return 4;
    case "easy":
      return 5;
  }
}

/** Quy đổi đúng/sai của mini-game → điểm chất lượng SM-2. */
export function correctnessToQuality(correct: boolean): number {
  return correct ? 4 : 2;
}

export interface SrsNext extends SrsState {
  /** true khi q < 3 (người học quên) → khoảng cách bị đặt lại về ~1 phút. */
  lapsed: boolean;
  /** Khoảng cách thật (phút) tới lần ôn kế — dùng để tính dueAt chính xác. */
  intervalMinutes: number;
}

/**
 * Cập nhật lịch ôn. `quality` là 0..5 (xem ratingToQuality / correctnessToQuality).
 * - q < 3  → quên: bậc về 0, hiện lại sau ~1 phút.
 * - q = 3  → khó : 1 ngày, không leo bậc.
 * - q = 4  → tốt : leo bậc theo GOOD_DAYS.
 * - q = 5  → dễ  : leo bậc theo EASY_DAYS.
 */
export function schedule(prev: SrsState, quality: number): SrsNext {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const lapsed = q < 3;

  let repetitions: number;
  let intervalDays: number;
  let intervalMinutes: number;

  if (lapsed) {
    repetitions = 0;
    intervalDays = 0;
    intervalMinutes = AGAIN_MINUTES;
  } else if (q === 3) {
    // Khó: ghim ở 1 ngày, giữ nguyên bậc (tối thiểu 1) để không tụt cũng không leo.
    repetitions = Math.max(1, prev.repetitions);
    intervalDays = 1;
    intervalMinutes = intervalDays * 24 * 60;
  } else {
    repetitions = prev.repetitions + 1;
    intervalDays = ladderValue(q === 5 ? EASY_DAYS : GOOD_DAYS, repetitions);
    intervalMinutes = intervalDays * 24 * 60;
  }

  // Cập nhật hệ số dễ (công thức SM-2), chặn sàn 1.3. Chỉ để ghi nhận, không
  // ảnh hưởng tới khoảng cách (đã dùng bậc thang ở trên).
  let ease = prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;
  ease = Math.round(ease * 100) / 100;

  return { repetitions, intervalDays, ease, lapsed, intervalMinutes };
}

/**
 * Thời điểm đến hạn ôn kế tiếp, tính từ `now`. `intervalDays === 0` nghĩa là dưới
 * một ngày (quên) → hiện lại sau AGAIN_MINUTES phút.
 */
export function nextDueAt(intervalDays: number, now: Date): Date {
  if (intervalDays <= 0) return new Date(now.getTime() + AGAIN_MINUTES * MINUTE_MS);
  return new Date(now.getTime() + intervalDays * DAY_MS);
}

/** Tính dueAt trực tiếp từ số phút (chính xác hơn, dùng cho mốc dưới 1 ngày). */
export function dueAtFromMinutes(intervalMinutes: number, now: Date): Date {
  return new Date(now.getTime() + Math.max(1, intervalMinutes) * MINUTE_MS);
}

/** Từ đã đến hạn ôn chưa? (chưa có lịch = coi như đến hạn — từ mới). */
export function isDue(dueAt: Date | string | null, now: Date = new Date()): boolean {
  if (!dueAt) return true;
  return new Date(dueAt).getTime() <= now.getTime();
}

/** Nhãn tiếng Việt cho khoảng cách ôn kế tiếp (hiển thị ở màn kết thúc). */
export function describeInterval(intervalDays: number): string {
  if (intervalDays <= 0) return "1 phút nữa";
  if (intervalDays === 1) return "ngày mai";
  if (intervalDays < 7) return `${intervalDays} ngày nữa`;
  if (intervalDays < 30) return `${Math.round(intervalDays / 7)} tuần nữa`;
  if (intervalDays < 365) return `${Math.round(intervalDays / 30)} tháng nữa`;
  return `${Math.round(intervalDays / 365)} năm nữa`;
}
