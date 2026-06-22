import styles from "./bao-buddy.module.css";

/**
 * BaoBuddy — phiên bản nhỏ, thuần CSS của linh vật bánh bao ở trang chủ.
 *
 * Không theo dõi con trỏ và không dùng hook → an toàn đặt trong cả Server lẫn
 * Client Component. Dùng để rải linh vật quanh app cho sinh động, nhất là ở các
 * màn hình "vừa làm xong bài".
 *
 * - pose="cheer": cười mở + lấp lánh + nảy lên — dành cho màn chúc mừng/kết quả.
 * - pose="idle":  cười nhẹ + chớp mắt + nổi bồng bềnh — dành cho lời chào / empty state.
 */
export function BaoBuddy({
  size = 88,
  pose = "idle",
  message,
  className,
  "aria-label": ariaLabel,
}: {
  size?: number;
  pose?: "cheer" | "idle";
  message?: string | null;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`${styles.wrap} ${pose === "cheer" ? styles.cheer : styles.idle}${
        className ? ` ${className}` : ""
      }`}
      style={{ "--bao-size": `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel ?? "Linh vật bánh bao DingDong"}
    >
      {message ? <div className={styles.bubble}>{message}</div> : null}

      <div className={styles.stage}>
        {pose === "cheer" && (
          <>
            <div className={`${styles.spark} ${styles.s1}`} />
            <div className={`${styles.spark} ${styles.s2}`} />
            <div className={`${styles.spark} ${styles.s3}`} />
            <div className={`${styles.spark} ${styles.s4}`} />
          </>
        )}

        <div className={styles.ground} />

        <div className={styles.bob}>
          <svg className={styles.bunSvg} viewBox="0 0 300 300" aria-hidden="true">
            <path
              className={styles.bunBody}
              d="M52,162 C52,92 95,62 150,62 C205,62 248,92 248,162 C248,228 205,252 150,252 C95,252 52,228 52,162 Z"
            />
            <path
              className={styles.bunShadow}
              d="M70,222 C100,248 200,248 230,222 C212,250 88,250 70,222 Z"
            />
            <ellipse
              className={styles.bunHi}
              cx="105"
              cy="110"
              rx="26"
              ry="18"
              transform="rotate(-22 105 110)"
            />
            <path
              className={styles.bunKnob}
              d="M138,66 C134,52 152,48 156,60 C159,69 148,74 144,68"
            />
          </svg>

          <div className={styles.face}>
            <div className={`${styles.eye} ${styles.l}`} />
            <div className={`${styles.eye} ${styles.r}`} />
            <div className={`${styles.cheek} ${styles.l}`} />
            <div className={`${styles.cheek} ${styles.r}`} />
            {pose === "cheer" ? (
              <div className={styles.mouthOpen}>
                <div className={styles.tongue} />
              </div>
            ) : (
              <div className={styles.smile} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
