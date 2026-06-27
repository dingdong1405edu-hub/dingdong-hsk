import * as React from "react";
import { PdfDocument, PdfTag } from "@/components/learn/pdf/pdf-document";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";

interface Props {
  title: string;
  taskTypeLabel: string;
  hskLevel: string;
  prompt: string;
  promptZh?: string | null;
  outline?: string | null;
  minChars: number;
  timeLimit: number;
}

/** PDF viết luận: đề bài + dàn ý gợi ý + yêu cầu (số chữ tối thiểu, thời gian) + khung làm bài. */
export function WritingPdf({ title, taskTypeLabel, hskLevel, prompt, promptZh, outline, minChars, timeLimit }: Props) {
  const outlineItems = (outline ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

  return (
    <PdfDocument kicker="Viết · 写作" title={title} subtitle={taskTypeLabel} hskLevel={hskLevel}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <PdfTag tone="brand">Tối thiểu {minChars} chữ</PdfTag>
        {timeLimit > 0 && <PdfTag tone="gold">{Math.round(timeLimit / 60)} phút</PdfTag>}
      </div>

      <div
        style={{
          borderRadius: 10,
          border: `1px solid ${PDF.line}`,
          borderLeft: `3px solid ${PDF.brand}`,
          background: PDF.paperTint,
          padding: "12px 14px",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PDF.gold }}>
          Đề bài
        </div>
        <p style={{ marginTop: 4, whiteSpace: "pre-line", fontSize: 15, color: PDF.ink, lineHeight: 1.6 }}>{prompt}</p>
        {promptZh && (
          <p style={{ marginTop: 4, whiteSpace: "pre-line", fontFamily: PDF_FONT.chinese, fontSize: 14, color: PDF.ink2 }}>
            {promptZh}
          </p>
        )}
      </div>

      {outlineItems.length > 0 && (
        <div
          style={{
            borderRadius: 10,
            border: `1px solid ${PDF.goldBorder}`,
            background: PDF.goldSoft,
            padding: "12px 14px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PDF.gold }}>
            Dàn ý gợi ý
          </div>
          <ul style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {outlineItems.map((item, i) => (
              <li key={i} style={{ display: "flex", gap: 7, fontSize: 14, color: PDF.ink2 }}>
                <span style={{ color: PDF.gold, fontWeight: 800 }}>•</span>
                <span style={{ whiteSpace: "pre-line" }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div style={{ marginBottom: 6, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: PDF.faint }}>
          Phần làm bài
        </div>
        <WritingGrid />
      </div>
    </PdfDocument>
  );
}

/** Khung ô vuông để viết tay (như giấy ô) — nhiều dòng để học viên làm bài. */
function WritingGrid() {
  const rows = 14;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 30,
            borderBottom: `1px solid ${PDF.line}`,
            breakInside: "avoid",
          }}
        />
      ))}
    </div>
  );
}
