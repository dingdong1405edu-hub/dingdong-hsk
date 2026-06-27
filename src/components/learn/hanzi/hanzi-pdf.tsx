import * as React from "react";
import { PdfDocument, PdfSection } from "@/components/learn/pdf/pdf-document";
import { PDF, PDF_FONT, pdfToneColor } from "@/lib/pdf/theme";

interface PdfExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
interface PdfChar {
  character: string;
  pinyin: string;
  tone: number;
  meaning: string;
  strokeCount: number;
  examples: PdfExample[];
}

interface Props {
  lessonTitle: string;
  hskLevel: string;
  characters: PdfChar[];
}

/** Một ô 田字格 (kẻ ô vuông có gạch chéo nét đứt) — có thể chứa chữ mẫu hoặc để trống tập viết. */
function TianGrid({ char, size = 48, guide = false }: { char?: string; size?: number; guide?: boolean }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size, border: `1px solid ${PDF.line}`, borderRadius: 4 }}>
      <div style={{ position: "absolute", left: "50%", top: 0, height: "100%", width: 0, borderLeft: `1px dashed ${PDF.lineSoft}`, transform: "translateX(-0.5px)" }} />
      <div style={{ position: "absolute", left: 0, top: "50%", width: "100%", height: 0, borderTop: `1px dashed ${PDF.lineSoft}`, transform: "translateY(-0.5px)" }} />
      {char && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: PDF_FONT.chinese,
            lineHeight: 1,
            fontSize: Math.round(size * 0.62),
            color: guide ? PDF.ink : "#d8dbc4",
          }}
        >
          {char}
        </span>
      )}
    </div>
  );
}

/** PDF luyện viết chữ Hán: mỗi chữ kèm pinyin · nghĩa · số nét, ô mẫu 田字格 và một hàng ô trống để tập viết. */
export function HanziPdf({ lessonTitle, hskLevel, characters }: Props) {
  return (
    <PdfDocument kicker="Luyện viết chữ Hán · 汉字" title={lessonTitle} hskLevel={hskLevel}>
      <PdfSection title={`Danh sách chữ (${characters.length})`}>
        {characters.length === 0 ? (
          <p style={{ fontSize: 13, color: PDF.muted }}>Bài này chưa có chữ Hán.</p>
        ) : (
          <ol style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {characters.map((c, i) => (
              <li
                key={i}
                style={{
                  breakInside: "avoid",
                  border: `1px solid ${PDF.line}`,
                  background: PDF.paperTint,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <TianGrid char={c.character} size={56} guide />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PDF.faint }}>{i + 1}.</span>
                      <span style={{ fontFamily: PDF_FONT.pinyin, fontSize: 17, fontWeight: 700, color: pdfToneColor(c.tone) }}>{c.pinyin}</span>
                      <span style={{ fontSize: 14, color: PDF.ink2 }}>{c.meaning}</span>
                      {c.strokeCount > 0 && <span style={{ fontSize: 11, color: PDF.faint }}>· {c.strokeCount} nét</span>}
                    </div>
                    {c.examples.length > 0 && (
                      <ul style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                        {c.examples.map((ex, j) => (
                          <li key={j} style={{ fontSize: 13 }}>
                            <span style={{ fontFamily: PDF_FONT.chinese, color: PDF.ink }}>{ex.hanzi}</span>
                            {ex.pinyin && <span style={{ marginLeft: 6, fontFamily: PDF_FONT.pinyin, fontSize: 11.5, color: PDF.brand }}>{ex.pinyin}</span>}
                            {ex.meaning && <span style={{ marginLeft: 6, color: PDF.muted }}>— {ex.meaning}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                {/* Hàng ô trống để tập viết */}
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Array.from({ length: 10 }).map((_, k) => (
                    <TianGrid key={k} size={38} />
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </PdfSection>
    </PdfDocument>
  );
}
