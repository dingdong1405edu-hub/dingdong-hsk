"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { GraduationCap, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
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

/**
 * Thanh điều hướng cố định — đổ bóng khi cuộn, có menu mobile.
 * `isAuthed` được suy ra ở server (qua `auth()`) nên không bị nhấp nháy: đã đăng
 * nhập thì hiện "Vào học" + "Đăng xuất"; chưa thì hiện "Đăng nhập" + "Học miễn phí".
 */
export function MarketingNav({ isAuthed = false }: { isAuthed?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const logout = () => signOut({ callbackUrl: "/" });

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

        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          {isAuthed ? (
            <>
              <button type="button" onClick={logout} className={styles.navLogin}>
                <LogOut className="h-4 w-4" aria-hidden="true" /> Đăng xuất
              </button>
              <Link href="/dashboard" className={styles.navCta}>
                <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.navLogin}>
                Đăng nhập
              </Link>
              <Link href="/register" className={styles.navCta}>
                Học miễn phí
              </Link>
            </>
          )}
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
        {isAuthed ? (
          <>
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học →
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={() => setOpen(false)}>
              Đăng nhập
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              Học miễn phí →
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
