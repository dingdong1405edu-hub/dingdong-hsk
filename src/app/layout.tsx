import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DingDong HSK — Học tiếng Trung chuẩn HSK",
  description: "Nền tảng học tiếng Trung chuẩn HSK 1-6 với AI grading, gamification và luyện nói HSKK",
  keywords: ["học tiếng Trung", "HSK", "HSKK", "tiếng Trung online", "DingDong"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
