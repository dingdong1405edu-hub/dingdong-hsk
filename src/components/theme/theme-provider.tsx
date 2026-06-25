"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/** Chế độ giao diện người dùng chọn. "system" = bám theo cài đặt thiết bị. */
export type ThemeMode = "light" | "dark" | "system";

/** PHẢI trùng với key trong inline-script chống FOUC ở `src/app/layout.tsx`. */
export const THEME_STORAGE_KEY = "dingdong-theme";

interface ThemeContextValue {
  /** Lựa chọn của người dùng (light | dark | system). */
  theme: ThemeMode;
  /** Giao diện thực tế đang áp dụng (light | dark) sau khi giải nghĩa "system". */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

/**
 * Áp dụng giao diện lên <html>: bật/tắt class `.dark` (Tailwind darkMode:"class")
 * và đặt `color-scheme` để trình duyệt KHÔNG tự ý "bôi đen" trang (auto-dark).
 * Trả về true nếu kết quả là tối.
 */
function applyTheme(mode: ThemeMode): boolean {
  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
  return isDark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Khởi tạo khớp với server-render (light) để tránh hydration mismatch;
  // giá trị thật được đồng bộ lại trong effect đầu tiên.
  const [theme, setThemeState] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  // Đồng bộ state với lựa chọn đã lưu + class đã được inline-script đặt sẵn.
  useEffect(() => {
    let stored: ThemeMode = "system";
    try {
      const raw = localStorage.getItem(THEME_STORAGE_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {
      // localStorage có thể bị chặn — bỏ qua, dùng "system".
    }
    setThemeState(stored);
    setResolvedTheme(applyTheme(stored) ? "dark" : "light");
  }, []);

  // Khi đang "theo thiết bị": lắng nghe OS đổi sáng/tối để cập nhật ngay.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      setResolvedTheme(applyTheme("system") ? "dark" : "light");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // bỏ qua nếu không ghi được
    }
    setResolvedTheme(applyTheme(next) ? "dark" : "light");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải được dùng bên trong <ThemeProvider>");
  return ctx;
}
