import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";

/**
 * Tạo PDF từ HTML bằng Chromium không giao diện (puppeteer-core — KHÔNG tự tải
 * Chromium). Dùng cho mọi route /api/pdf/*.
 *
 * - Production (Railway): nixpacks cài sẵn `chromium` (xem nixpacks.toml). Đặt
 *   PUPPETEER_EXECUTABLE_PATH nếu muốn chỉ định tay; mặc định tự dò trên PATH.
 * - Local (Windows/macOS/Linux): tự dò Google Chrome/Chromium/Edge đã cài, hoặc
 *   đặt PUPPETEER_EXECUTABLE_PATH trong .env.
 *
 * Giữ MỘT instance trình duyệt dùng lại giữa các request (mỗi request mở 1 tab)
 * để nhanh & cache được font CJK trong tiến trình Chromium.
 */

let browserPromise: Promise<Browser> | null = null;

function which(cmd: string): string | null {
  try {
    const finder = process.platform === "win32" ? "where" : "which";
    const out = execSync(`${finder} ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0];
    return out && existsSync(out) ? out : null;
  } catch {
    return null;
  }
}

function resolveExecutable(): string {
  const env = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (env && existsSync(env)) return env;

  // Trên PATH (nix `chromium` ở Railway, hoặc bản cài hệ thống).
  for (const name of ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome", "chrome"]) {
    const found = which(name);
    if (found) return found;
  }

  // Đường dẫn phổ biến theo hệ điều hành.
  const candidates =
    process.platform === "win32"
      ? [
          `${process.env["PROGRAMFILES"] || "C:\\Program Files"}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)"}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env.LOCALAPPDATA || ""}\\Google\\Chrome\\Application\\chrome.exe`,
          `${process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)"}\\Microsoft\\Edge\\Application\\msedge.exe`,
          `${process.env.PROGRAMFILES || "C:\\Program Files"}\\Microsoft\\Edge\\Application\\msedge.exe`,
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          ]
        : [
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/google-chrome",
            "/snap/bin/chromium",
          ];

  for (const p of candidates) if (p && existsSync(p)) return p;

  throw new Error(
    "Không tìm thấy Chromium để tạo PDF. Cài Google Chrome hoặc đặt PUPPETEER_EXECUTABLE_PATH trỏ tới chrome/chromium.",
  );
}

async function launch(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: resolveExecutable(),
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
    protocolTimeout: 60_000,
  });
}

async function getBrowser(): Promise<Browser> {
  const current = browserPromise;
  if (current) {
    try {
      const existing = await current;
      if (existing.connected) return existing;
    } catch {
      /* launch trước đó lỗi → rơi xuống tạo mới */
    }
    // Chromium đã chết / launch lỗi. CHỈ "chủ" của promise hiện tại mới được reset
    // (tránh đua: nhiều request cùng thấy 1 promise hỏng rồi mỗi request launch 1
    // Chromium → rò tiến trình). Caller khác khi await xong sẽ thấy promise mới.
    if (browserPromise === current) browserPromise = null;
    return getBrowser();
  }

  const p = (async () => {
    const browser = await launch();
    // Chromium ngắt/chết → tự bỏ instance để lần sau khởi động lại.
    browser.once("disconnected", () => {
      if (browserPromise === p) browserPromise = null;
    });
    return browser;
  })();
  browserPromise = p;
  p.catch(() => {
    if (browserPromise === p) browserPromise = null; // launch lỗi → cho thử lại
  });
  return p;
}

/** Chân trang lặp ở mỗi trang in: CHỈ "dingdonghsk.com" + số trang. */
const FOOTER_TEMPLATE = `
<div style="width:100%; font-size:8px; color:#9aa0ad; font-family: Arial, sans-serif; padding:0 13mm; display:flex; align-items:center; justify-content:space-between;">
  <span style="display:inline-flex; align-items:center; gap:4px; font-weight:700; color:#5d7740;">
    <span style="display:inline-block; width:5px; height:5px; border-radius:50%; background:#b8862f;"></span>
    dingdonghsk.com
  </span>
  <span style="color:#9aa0ad;">Trang <span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;

/** Render HTML đầy đủ → PDF (A4, in màu, chân trang thương hiệu). */
export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    // Đảm bảo web-font (Noto Sans SC / Nunito / Serif) đã tải xong trước khi in —
    // nếu không, chữ Hán có thể ra ô vuông (tofu) trong PDF.
    try {
      await page.evaluate(async () => {
        const d = document as unknown as {
          fonts: { ready: Promise<unknown>; load: (font: string) => Promise<unknown> };
        };
        await Promise.all([
          d.fonts.load("400 15px 'Noto Sans SC'"),
          d.fonts.load("700 15px 'Noto Sans SC'"),
          d.fonts.load("700 18px 'Nunito'"),
          d.fonts.load("400 12px 'Noto Serif'"),
        ]).catch(() => {});
        await d.fonts.ready;
      });
    } catch {
      /* không hỗ trợ document.fonts → bỏ qua */
    }
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: "14mm", bottom: "16mm", left: "13mm", right: "13mm" },
    });
    return pdf;
  } finally {
    await page.close().catch(() => {});
  }
}
