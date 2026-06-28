import styles from "./bao-buddy.module.css";

/** Các tư thế của linh vật Bao. */
export type BaoPose = "idle" | "cheer" | "wave" | "think" | "sad" | "proud";

/**
 * BaoArt — phần "vẽ" thuần CSS của linh vật bánh bao (thân + mặt + tay + hiệu ứng),
 * tách riêng để dùng lại ở BaoBuddy (trang trí, server-safe) và BaoCompanion
 * (bong bóng nổi có tương tác). Không state, không hook → đặt được mọi nơi.
 *
 * Kích thước điều khiển bằng biến CSS `--bao-size` đặt ở phần tử cha.
 */
export function BaoArt({
  pose = "idle",
  className,
}: {
  pose?: BaoPose;
  className?: string;
}) {
  const poseClass = styles[pose] ?? styles.idle;
  const open = pose === "cheer" || pose === "proud";

  return (
    <div className={`${styles.stage} ${poseClass}${className ? ` ${className}` : ""}`}>
      {open && (
        <>
          <div className={`${styles.spark} ${styles.s1}`} />
          <div className={`${styles.spark} ${styles.s2}`} />
          <div className={`${styles.spark} ${styles.s3}`} />
          <div className={`${styles.spark} ${styles.s4}`} />
        </>
      )}

      <div className={styles.ground} />

      <div className={styles.bob}>
        <div className={`${styles.arm} ${styles.l}`} />
        <div className={`${styles.arm} ${styles.r}`} />

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
          {open ? (
            <div className={styles.mouthOpen}>
              <div className={styles.tongue} />
            </div>
          ) : pose === "sad" ? (
            <div className={styles.frown} />
          ) : (
            <div className={styles.smile} />
          )}
        </div>
      </div>
    </div>
  );
}
