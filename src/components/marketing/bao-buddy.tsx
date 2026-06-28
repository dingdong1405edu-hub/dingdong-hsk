import styles from "./bao-buddy.module.css";
import { BaoArt, type BaoPose } from "./bao-art";

/**
 * BaoBuddy — linh vật bánh bao kích thước nhỏ, thuần CSS (không theo dõi con trỏ,
 * không hook → an toàn trong cả Server lẫn Client Component). Dùng để rải Bao quanh
 * app cho sinh động: lời chào, empty state, màn "vừa làm xong bài".
 *
 * Tư thế (pose):
 * - idle:  cười nhẹ + chớp mắt + nổi bồng bềnh (mặc định).
 * - wave:  vẫy tay chào — dành cho lời chào.
 * - cheer / proud: cười mở + lấp lánh + nảy lên — dành cho màn chúc mừng/kết quả.
 * - think: nghiêng đầu, tay lên cằm — dành cho lúc "đang xử lý".
 * - sad:   mếu nhẹ — dành cho kết quả chưa đạt / động viên.
 */
export function BaoBuddy({
  size = 88,
  pose = "idle",
  message,
  className,
  "aria-label": ariaLabel,
}: {
  size?: number;
  pose?: BaoPose;
  message?: string | null;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`${styles.wrap}${className ? ` ${className}` : ""}`}
      style={{ "--bao-size": `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel ?? "Linh vật bánh bao DingDong"}
    >
      {message ? <div className={styles.bubble}>{message}</div> : null}
      <BaoArt pose={pose} />
    </div>
  );
}
