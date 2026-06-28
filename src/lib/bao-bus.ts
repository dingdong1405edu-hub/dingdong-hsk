/**
 * Bao bus — kênh sự kiện cực nhẹ để mọi luồng học "ra hiệu" cho linh vật Bao phản
 * ứng (đúng/sai/hoàn thành/đang chấm…) mà KHÔNG phải truyền prop xuyên nhiều tầng.
 *
 * Cơ chế: phát/nhận qua `window` CustomEvent. An toàn SSR (mọi hàm tự bỏ qua khi
 * không có `window`). Bao companion nổi ở góc màn hình (xem bao-companion.tsx) là
 * nơi lắng nghe chính; bất kỳ component nào cũng có thể `emitBao(...)`.
 */

export type BaoReaction =
  | "correct" // trả lời đúng → nảy lên, mặt vui
  | "wrong" // trả lời sai → lắc đầu, mặt buồn
  | "complete" // xong một bài/section → reo nhẹ
  | "celebrate" // hoàn thành lớn (đạt điểm cao) → reo + lấp lánh
  | "streak" // giữ chuỗi / cột mốc → tự hào
  | "heartGift" // được tặng tim → tự hào
  | "heartLost" // mất tim → buồn/lo
  | "thinking" // AI đang chấm → suy nghĩ
  | "wave"; // chào hỏi

export interface BaoSignal {
  reaction: BaoReaction;
  /** Lời thoại ngắn hiện trên bong bóng (tuỳ chọn). */
  message?: string;
}

const EVENT = "bao:react";

/** Phát một tín hiệu cho Bao. Gọi được từ bất kỳ đâu phía client. */
export function emitBao(reaction: BaoReaction, message?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<BaoSignal>(EVENT, { detail: { reaction, message } }),
  );
}

/** Đăng ký nhận tín hiệu Bao. Trả về hàm huỷ đăng ký. */
export function onBao(handler: (signal: BaoSignal) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<BaoSignal>).detail;
    if (detail) handler(detail);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
