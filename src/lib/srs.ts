// Thuật toán lặp lại ngắt quãng (spaced repetition) cho chế độ "Ôn từ".
// Cài đặt theo SM-2 (SuperMemo 2) — chuẩn kinh điển cho ghi nhớ dài hạn: mỗi từ
// có một "hệ số dễ" (ease) và một khoảng cách (intervalDays); trả lời tốt → giãn
// khoảng cách, trả lời sai (quên) → đặt lại về ôn sớm. Hàm thuần (pure) nên dùng
// được ở cả server action và client component (chỉ tính toán, không chạm DB).

export interface SrsState {
  repetitions: number; // số lần trả lời đạt (q>=3) liên tiếp
  intervalDays: number; // khoảng cách hiện tại tính theo ngày
  ease: number; // easiness factor (>= 1.3)
}

/** Trạng thái khởi đầu cho một từ chưa từng ôn. */
export const SRS_DEFAULT: SrsState = { repetitions: 0, intervalDays: 0, ease: 2.5 };

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  /** true khi q < 3 (người học quên) → khoảng cách bị đặt lại. */
  lapsed: boolean;
}

/**
 * Cập nhật lịch ôn theo SM-2. `quality` là 0..5 (xem ratingToQuality /
 * correctnessToQuality). Trả về trạng thái kế tiếp; `intervalDays` luôn >= 1.
 */
export function schedule(prev: SrsState, quality: number): SrsNext {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let repetitions = prev.repetitions;
  let intervalDays: number;
  const lapsed = q < 3;

  if (lapsed) {
    // Quên → học lại từ đầu, hiện lại sau ~1 ngày.
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(prev.intervalDays * prev.ease);
    intervalDays = Math.max(1, intervalDays);
  }

  // Cập nhật hệ số dễ (công thức SM-2), chặn sàn 1.3.
  let ease = prev.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < MIN_EASE) ease = MIN_EASE;
  ease = Math.round(ease * 100) / 100;

  return { repetitions, intervalDays, ease, lapsed };
}

/** Thời điểm đến hạn ôn kế tiếp, tính từ `now`. */
export function nextDueAt(intervalDays: number, now: Date): Date {
  return new Date(now.getTime() + intervalDays * DAY_MS);
}

/** Từ đã đến hạn ôn chưa? (chưa có lịch = coi như đến hạn — từ mới). */
export function isDue(dueAt: Date | string | null, now: Date = new Date()): boolean {
  if (!dueAt) return true;
  return new Date(dueAt).getTime() <= now.getTime();
}

/** Nhãn tiếng Việt cho khoảng cách ôn kế tiếp (hiển thị ở màn kết thúc). */
export function describeInterval(intervalDays: number): string {
  if (intervalDays <= 0) return "hôm nay";
  if (intervalDays === 1) return "ngày mai";
  if (intervalDays < 7) return `${intervalDays} ngày nữa`;
  if (intervalDays < 30) return `${Math.round(intervalDays / 7)} tuần nữa`;
  if (intervalDays < 365) return `${Math.round(intervalDays / 30)} tháng nữa`;
  return `${Math.round(intervalDays / 365)} năm nữa`;
}
