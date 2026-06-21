"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import styles from "../landing.module.css";

const LINKS = [
  { href: "/#features", label: "Tính năng" },
  { href: "/#how", label: "Cách học" },
  { href: "/#levels", label: "Lộ trình HSK" },
  { href: "/#testimonials", label: "Đánh giá" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
];

/** Anchor hash (#...) → thẻ <a>; route thuần (/gioi-thieu) → <Link> của Next. */
const isRoute = (href: string) => href.startsWith("/") && !href.includes("#");

/** Thanh điều hướng cố định — đổ bóng khi cuộn, có menu mobile. */
export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`${styles.navbar}${scrolled ? ` ${styles.navbarScrolled}` : ""}`}
      aria-label="Điều hướng chính"
    >
      <div className={styles.navContainer}>
        <Link href="/" className={styles.navLogo} aria-label="DingDong HSK — về trang chủ">
          <Logo className={styles.navLogoIcon} />
          <span>
            DingDong <b>HSK</b>
          </span>
        </Link>

        <ul className={styles.navLinks}>
          {LINKS.map((l) => (
            <li key={l.href}>
              {isRoute(l.href) ? (
                <Link href={l.href}>{l.label}</Link>
              ) : (
                <a href={l.href}>{l.label}</a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-4">
          <Link href="/login" className={styles.navLogin}>
            Đăng nhập
          </Link>
          <Link href="/register" className={styles.navCta}>
            Học miễn phí
          </Link>
          <button
            type="button"
            className={styles.mobileBtn}
            aria-label="Mở menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <div className={`${styles.mobileMenu}${open ? ` ${styles.mobileMenuOpen}` : ""}`}>
        {LINKS.map((l) =>
          isRoute(l.href) ? (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ) : (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ),
        )}
        <Link href="/login" onClick={() => setOpen(false)}>
          Đăng nhập
        </Link>
        <Link href="/register" onClick={() => setOpen(false)}>
          Học miễn phí →
        </Link>
      </div>
    </nav>
  );
}
