import * as React from "react";
import { htmlToPdf } from "@/lib/pdf/browser";
import { getLogoDataUri } from "@/lib/pdf/logo";

/**
 * Nạp `react-dom/server` ĐỘNG lúc chạy. Next (App Router) chặn import TĨNH
 * `react-dom/server` trong đồ thị route ("You're importing a component that
 * imports react-dom/server"). Dynamic import + `webpackIgnore` né được kiểm tra
 * tĩnh; chỉ chạy ở Node runtime của route /api/pdf/*.
 */
let _renderToStaticMarkup: ((node: React.ReactElement) => string) | null = null;
async function getRenderToStaticMarkup(): Promise<(node: React.ReactElement) => string> {
  if (_renderToStaticMarkup) return _renderToStaticMarkup;
  const mod = (await import(/* webpackIgnore: true */ "react-dom/server")) as unknown as {
    renderToStaticMarkup?: (node: React.ReactElement) => string;
    default?: { renderToStaticMarkup?: (node: React.ReactElement) => string };
  };
  const fn = mod.renderToStaticMarkup ?? mod.default?.renderToStaticMarkup;
  if (!fn) throw new Error("Không nạp được react-dom/server.renderToStaticMarkup");
  _renderToStaticMarkup = fn;
  return fn;
}

/** Bọc markup thành một trang HTML hoàn chỉnh (nạp web-font + reset in màu). */
function buildHtmlDocument(markup: string, title: string): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif:wght@400;600;700&family=Noto+Color+Emoji&display=swap" />
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: 'Nunito', 'Noto Sans SC', 'Noto Sans CJK SC', 'Noto Color Emoji', system-ui, sans-serif; color: #2a2f45; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
  img { max-width: 100%; }
  h1, h2, h3 { margin: 0; }
  ol, ul { margin: 0; padding: 0; }
  li { list-style: none; }
  p { margin: 0; }
</style>
</head>
<body>${markup}</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}

/** Tên file an toàn cho header (ascii fallback) + .pdf. */
function asciiFileName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu tiếng Việt
    .replace(/[^\x20-\x7e]/g, "") // bỏ ký tự ngoài ascii (vd chữ Hán)
    .replace(/["\\/:*?<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (base || "dingdong-hsk") + ".pdf";
}

/**
 * Render một component PDF → trả về Response tải file PDF.
 * @param node     Element React của tài liệu (vd <ReadingPdf … />).
 * @param fileName Tên file mong muốn (chưa cần .pdf), có thể chứa tiếng Việt/Hán.
 */
export async function renderPdfResponse(node: React.ReactElement, fileName: string): Promise<Response> {
  const title = fileName;
  const renderToStaticMarkup = await getRenderToStaticMarkup();
  let markup = renderToStaticMarkup(node);
  // setContent không có base URL → nhúng logo dạng data-URI thay cho đường dẫn tĩnh.
  const logo = getLogoDataUri();
  if (logo) markup = markup.split('src="/logo-hsk.png"').join(`src="${logo}"`);
  const html = buildHtmlDocument(markup, title);
  const pdf = await htmlToPdf(html);

  const ascii = asciiFileName(fileName);
  // RFC 5987 ext-value: encodeURIComponent bỏ sót ' ( ) * ! (dấu nháy đơn là ký
  // tự phân tách của UTF-8''… nên phải mã hoá) → mã hoá nốt cho header hợp lệ.
  const utf8 = encodeURIComponent(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`).replace(
    /['()*!]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );

  // Bọc lại trong Uint8Array (backing ArrayBuffer) cho hợp BodyInit trên mọi
  // phiên bản @types/node (giống src/app/api/files/[id]/route.ts).
  const body = new Uint8Array(pdf);
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
