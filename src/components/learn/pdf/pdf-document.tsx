import * as React from "react";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";
import { hskLevelLabel } from "@/lib/utils";

/* Logo dùng đường dẫn tĩnh để component render được cả trên TRÌNH DUYỆT (trang xem
 * trước) lẫn server. Khi tạo PDF, src/lib/pdf/render.tsx thay "/logo-hsk.png" bằng
 * data-URI (vì page.setContent không có base URL). */
const LOGO_SRC = "/logo-hsk.png";

/* Khung & các mảnh dựng dùng chung cho mọi tài liệu PDF. Toàn bộ dùng INLINE
 * STYLE (không Tailwind) để render độc lập qua renderToStaticMarkup → Chromium.
 * Chỉ render ở server (route /api/pdf/*). */

interface DocProps {
  /** Loại tài liệu, in nhỏ phía trên tiêu đề (vd "Đọc hiểu", "Luyện nói"). */
  kicker: string;
  title: string;
  titleZh?: string | null;
  /** Dòng phụ dưới tiêu đề (vd tên unit / loại bài). */
  subtitle?: string | null;
  hskLevel: string;
  children: React.ReactNode;
}

/** Tài liệu PDF: dải header thương hiệu + khối tiêu đề + nội dung. */
export function PdfDocument({ kicker, title, titleZh, subtitle, hskLevel, children }: DocProps) {
  return (
    <div style={{ fontFamily: PDF_FONT.sans, color: PDF.ink, fontSize: 13, lineHeight: 1.55 }}>
      {/* Dải header thương hiệu */}
      <div
        style={{
          background: `linear-gradient(135deg, ${PDF.brand} 0%, ${PDF.brandDeep} 100%)`,
          borderRadius: 16,
          padding: "15px 20px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URI nhúng trong PDF / ảnh tĩnh khi xem trước */}
            <img src={LOGO_SRC} alt="DingDong HSK" style={{ width: 34, height: 34, objectFit: "contain" }} />
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>DingDong HSK</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)" }}>
              Học tiếng Trung · HSK 1–6
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>
            {kicker}
          </span>
          <span
            style={{
              background: "#ffffff",
              color: PDF.brandDark,
              borderRadius: 999,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {hskLevelLabel(hskLevel)}
          </span>
        </div>
      </div>

      {/* Khối tiêu đề */}
      <div style={{ margin: "18px 0 16px" }}>
        {subtitle && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: PDF.gold }}>
            {subtitle}
          </div>
        )}
        <h1 style={{ margin: "2px 0 0", fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em", color: PDF.ink, lineHeight: 1.2 }}>
          {title}
        </h1>
        {titleZh && (
          <p style={{ margin: "3px 0 0", fontFamily: PDF_FONT.chinese, fontSize: 14, color: PDF.muted }}>{titleZh}</p>
        )}
        <div style={{ marginTop: 10, width: 44, height: 3, borderRadius: 2, background: PDF.gold }} />
      </div>

      {children}
    </div>
  );
}

/** Tiêu đề một phần (có thanh nhấn xanh bên trái). */
export function PdfSection({
  title,
  titleZh,
  children,
  style,
}: {
  title: string;
  titleZh?: string | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section style={{ marginBottom: 18, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9, breakAfter: "avoid" }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: PDF.brand, flexShrink: 0 }} />
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: PDF.brandDark }}>{title}</h2>
        {titleZh && <span style={{ fontFamily: PDF_FONT.chinese, fontSize: 12, color: PDF.faint }}>{titleZh}</span>}
      </div>
      {children}
    </section>
  );
}

/** Thẻ nội dung bo góc (câu hỏi, từ vựng, chữ Hán…). */
export function PdfCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        breakInside: "avoid",
        border: `1px solid ${PDF.line}`,
        background: PDF.paperTint,
        borderRadius: 10,
        padding: 12,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Số thứ tự tròn (chip xanh thương hiệu). */
export function PdfNumChip({ n, size = 22 }: { n: number; size?: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 999,
        background: PDF.brand,
        color: "#fff",
        fontSize: size * 0.5,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {n}
    </span>
  );
}

/** Nhãn nhỏ (loại câu hỏi / loại bài). */
export function PdfTag({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "brand" }) {
  const map = {
    muted: { bg: "#f1efe6", fg: PDF.muted, bd: PDF.line },
    gold: { bg: PDF.goldSoft, fg: PDF.gold, bd: PDF.goldBorder },
    brand: { bg: PDF.brandSoft, fg: PDF.brandDark, bd: PDF.brandSoftBorder },
  }[tone];
  return (
    <span
      style={{
        background: map.bg,
        color: map.fg,
        border: `1px solid ${map.bd}`,
        borderRadius: 999,
        padding: "2px 9px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

/** Hộp lưu ý (callout vàng ấm) — vd ghi chú nghe online ở bài nghe. */
export function PdfNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 16,
        borderRadius: 10,
        border: `1px solid ${PDF.goldBorder}`,
        background: PDF.goldSoft,
        color: "#7a5a16",
        padding: "9px 13px",
        fontSize: 12.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/** Khối đáp án (gạch đứt phía trên, dấu ✓ xanh). */
export function PdfAnswer({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 9, borderTop: `1px dashed ${PDF.line}`, paddingTop: 8 }}>{children}</div>
  );
}

/** Dòng "Đáp án: …" với dấu tick. */
export function PdfAnswerLine({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
      <span
        style={{
          color: PDF.correct,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        ✓ Đáp án:
      </span>
      <span style={{ fontFamily: PDF_FONT.chinese, color: PDF.ink, fontWeight: 600 }}>{children}</span>
    </div>
  );
}
