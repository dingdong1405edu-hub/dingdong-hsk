"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import styles from "../landing.module.css";

/** Nút cuộn lên đầu trang — hiện khi cuộn quá 1 màn hình. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Lên đầu trang"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`${styles.backToTop}${visible ? ` ${styles.backToTopVisible}` : ""}`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
