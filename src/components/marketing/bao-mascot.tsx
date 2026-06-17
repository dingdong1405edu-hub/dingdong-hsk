"use client";

import { useEffect, useRef } from "react";
import styles from "./bao-mascot.module.css";

/**
 * Linh vật bánh bao của DingDong HSK.
 * Mắt dõi theo con trỏ, cười mở khi con trỏ lại gần, chớp mắt định kỳ.
 * Toàn bộ animation nền chạy bằng CSS; chỉ phần tương tác con trỏ dùng JS.
 */
export function BaoMascot() {
  const panelRef = useRef<HTMLDivElement>(null);
  const squishRef = useRef<HTMLDivElement>(null);
  const eyeLRef = useRef<HTMLDivElement>(null);
  const eyeRRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const squish = squishRef.current;
    const panel = panelRef.current;
    const eyes = [eyeLRef.current, eyeRRef.current].filter(
      (e): e is HTMLDivElement => e !== null,
    );
    if (!squish || !panel) return;

    const center = panel.getBoundingClientRect();
    let tx = center.left + center.width / 2;
    let ty = center.top + center.height / 2;
    let cx = tx;
    let cy = ty;
    let raf = 0;
    let blinkTimer: ReturnType<typeof setTimeout> | undefined;

    const onPointer = (e: PointerEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) {
        tx = t.clientX;
        ty = t.clientY;
      }
    };

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("touchmove", onTouch, { passive: true });

    const frame = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;

      for (const eye of eyes) {
        const r = eye.getBoundingClientRect();
        const ex = r.left + r.width / 2;
        const ey = r.top + r.height / 2;
        const a = Math.atan2(cy - ey, cx - ex);
        const d = Math.min(r.width * 0.5, Math.hypot(cx - ex, cy - ey) / 26);
        eye.style.transform = `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px))`;
      }

      const b = squish.getBoundingClientRect();
      const near =
        Math.hypot(tx - (b.left + b.width / 2), ty - (b.top + b.height / 2)) <
        b.width * 0.7;
      squish.classList.toggle(styles.happy, near);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const blinkLoop = () => {
      const wait = 2000 + (performance.now() % 2200);
      blinkTimer = setTimeout(() => {
        squish.classList.add(styles.blinking);
        setTimeout(() => squish.classList.remove(styles.blinking), 240);
        blinkLoop();
      }, wait);
    };
    blinkLoop();

    return () => {
      cancelAnimationFrame(raf);
      if (blinkTimer) clearTimeout(blinkTimer);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <div className={styles.wrap}>
      <div ref={panelRef} className={styles.panel}>
        <div className={styles.bubble}>
          NǏ HǍO <b>🥟</b>
        </div>

        <div className={styles.stage}>
          <svg className={styles.steam} aria-hidden="true">
            <path
              className={`${styles.wisp} ${styles.a}`}
              d="M8,150 q14,-22 0,-44 q-14,-22 0,-44 q14,-22 0,-44"
            />
            <path
              className={`${styles.wisp} ${styles.b}`}
              d="M8,170 q14,-25 0,-50 q-14,-25 0,-50 q14,-25 0,-50"
            />
            <path
              className={`${styles.wisp} ${styles.c}`}
              d="M8,150 q14,-22 0,-44 q-14,-22 0,-44 q14,-22 0,-44"
            />
          </svg>

          <div className={`${styles.spark} ${styles.s1}`} />
          <div className={`${styles.spark} ${styles.s2}`} />
          <div className={`${styles.spark} ${styles.s3}`} />
          <div className={`${styles.spark} ${styles.s4}`} />

          <div className={styles.ground} />
          <div className={styles.steamer} />

          <div className={styles.baoPos}>
            <div className={styles.bounce}>
              <div className={styles.wobble}>
                <div ref={squishRef} className={styles.squish}>
                  <svg className={styles.bunSvg} viewBox="0 0 300 300" aria-label="Linh vật bánh bao">
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
                    <div ref={eyeLRef} className={`${styles.eye} ${styles.l}`} />
                    <div ref={eyeRRef} className={`${styles.eye} ${styles.r}`} />
                    <div className={`${styles.cheek} ${styles.l}`} />
                    <div className={`${styles.cheek} ${styles.r}`} />
                    <div className={styles.smile} />
                    <div className={styles.mouthOpen}>
                      <div className={styles.tongue} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
