/**
 * Bảng màu & font dùng chung cho MỌI tài liệu PDF (đọc/nghe/viết/nói/từ vựng/ngữ
 * pháp/chữ Hán — cả Luyện kỹ năng lẫn Lộ trình).
 *
 * PDF được tạo ở server bằng Chromium (xem src/lib/pdf/*). Các component PDF dùng
 * INLINE STYLE (không Tailwind) để render độc lập qua renderToStaticMarkup → HTML
 * → Chromium. Vì vậy mọi màu/độ giãn cách gom về đây cho đồng nhất & đúng thương
 * hiệu (xanh ô-liu tri thức #5d7740 + kem ấm + nhấn vàng).
 */
export const PDF = {
  // Thương hiệu — đồng bộ với app (globals.css: --primary 88 30% 36% = #5d7740).
  brand: "#5d7740",
  brandDark: "#41562d",
  brandDeep: "#34481f",
  brandSoft: "#eef2e3", // nền xanh rất nhạt cho khối nhấn
  brandSoftBorder: "#d7e0c2",

  gold: "#b8862f",
  goldSoft: "#fbf3df",
  goldBorder: "#ecdcb0",

  ink: "#2a2f45", // chữ chính
  ink2: "#4a4f63", // chữ phụ đậm
  muted: "#6b7180", // chữ phụ
  faint: "#9aa0ad", // nhãn mờ
  line: "#e7e3d6", // viền/đường kẻ ấm
  lineSoft: "#efece2",
  paper: "#ffffff",
  paperTint: "#faf8f1", // nền card ấm rất nhạt

  // Ngữ nghĩa
  correct: "#2f7d4f", // xanh lá "đáp án đúng"
  correctSoft: "#eaf6ee",
  wrong: "#c0392b",

  // Màu thanh điệu (đồng bộ utils.toneColor): 1 đỏ · 2 lục · 3 lam · 4 tím · nhẹ xám
  tone: ["#9aa0ad", "#d4453a", "#2f9e54", "#2f73d8", "#8a4fd0"] as const,
} as const;

/** Font: chữ Hán Noto Sans SC, pinyin Noto Serif, còn lại Nunito (đồng bộ app). */
export const PDF_FONT = {
  sans: "'Nunito', 'Noto Sans SC', system-ui, sans-serif",
  chinese: "'Noto Sans SC', 'Noto Sans CJK SC', sans-serif",
  pinyin: "'Noto Serif', Georgia, serif",
} as const;

/** Màu thanh điệu (1–4, 0/neutral) cho pinyin chữ Hán. */
export function pdfToneColor(tone: number): string {
  return PDF.tone[tone] ?? PDF.ink;
}
