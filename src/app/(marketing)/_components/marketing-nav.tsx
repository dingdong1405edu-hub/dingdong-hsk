"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
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

  // Khi menu mobile mở: khoá cuộn nền, đóng bằng Esc, và tự đóng khi phóng to
  // sang desktop (tránh menu kẹt mở khi xoay ngang / đổi kích thước).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onResize = () => window.innerWidth > 768 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const logout = () => signOut({ callbackUrl: "/" });
  const close = () => setOpen(false);

  return (
    <>
    <nav
      className={`${styles.navbar}${scrolled ? ` ${styles.navbarScrolled}` : ""}`}
      aria-label="Điều hướng chính"
    >
      <div className={styles.navContainer}>
        <Link href="/" className={styles.navLogo} aria-label="DingDong HSK — về trang chủ" onClick={close}>
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

        <div className={styles.navActions}>
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
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`${styles.mobileMenu}${open ? ` ${styles.mobileMenuOpen}` : ""}`}
      >
        {LINKS.map((l) =>
          isRoute(l.href) ? (
            <Link key={l.href} href={l.href} onClick={close}>
              {l.label}
            </Link>
          ) : (
            <a key={l.href} href={l.href} onClick={close}>
              {l.label}
            </a>
          ),
        )}
        {isAuthed ? (
          <>
            <button
              type="button"
              onClick={() => {
                close();
                logout();
              }}
            >
              <LogOut className="h-[18px] w-[18px]" aria-hidden="true" /> Đăng xuất
            </button>
            <Link href="/dashboard" className={styles.mobileCta} onClick={close}>
              <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" /> Vào học →
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" onClick={close}>
              Đăng nhập
            </Link>
            <Link href="/register" className={styles.mobileCta} onClick={close}>
              Học miễn phí →
            </Link>
          </>
        )}
      </div>
    </nav>

    {/* Lớp phủ — đặt NGOÀI <nav> (navbar có backdrop-filter nên sẽ "giam" phần tử
        fixed bên trong); để đây mới phủ đúng toàn màn hình. Chạm để đóng menu. */}
    <button
      type="button"
      aria-hidden={!open}
      tabIndex={-1}
      className={`${styles.mobileBackdrop}${open ? ` ${styles.mobileBackdropOpen}` : ""}`}
      onClick={close}
    />
    </>
  );
}
