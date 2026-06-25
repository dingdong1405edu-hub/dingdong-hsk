import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DingDong HSK — Học tiếng Trung chuẩn HSK",
  description: "Nền tảng học tiếng Trung chuẩn HSK 1-6 với AI grading, gamification và luyện nói HSKK",
  keywords: ["học tiếng Trung", "HSK", "HSKK", "tiếng Trung online", "DingDong"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Khai báo hỗ trợ cả 2 giao diện để trình duyệt KHÔNG tự "bôi đen" trang.
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1118" },
  ],
};

/**
 * Chạy TRƯỚC khi trình duyệt vẽ: đặt class `.dark` + `color-scheme` theo lựa
 * chọn đã lưu (hoặc cài đặt thiết bị) để tránh nhấp nháy (FOUC) và chặn trình
 * duyệt tự động đảo màu. Key phải trùng THEME_STORAGE_KEY trong theme-provider.
 */
const themeScript = `(function(){try{var k='dingdong-theme';var s=localStorage.getItem(k);if(s!=='light'&&s!=='dark'&&s!=='system')s='system';var d=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" theme="system" />
      </body>
    </html>
  );
}
