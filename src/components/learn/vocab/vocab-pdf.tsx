import * as React from "react";
import { PdfDocument, PdfSection, PdfNumChip } from "@/components/learn/pdf/pdf-document";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";

interface PdfExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
interface PdfWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  examples: PdfExample[];
}

interface Props {
  lessonTitle: string;
  unitTitle: string;
  unitTitleZh?: string | null;
  hskLevel: string;
  words: PdfWord[];
}

/** PDF từ vựng: danh sách từ (Hán · pinyin · nghĩa) kèm câu ví dụ. */
export function VocabPdf({ lessonTitle, unitTitle, unitTitleZh, hskLevel, words }: Props) {
  return (
    <PdfDocument kicker="Từ vựng · 词汇" title={lessonTitle} subtitle={unitTitle} titleZh={unitTitleZh} hskLevel={hskLevel}>
      <PdfSection title={`Danh sách từ (${words.length})`}>
        {words.length === 0 ? (
          <p style={{ fontSize: 13, color: PDF.muted }}>Bài này chưa có từ.</p>
        ) : (
          <ol style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {words.map((w, i) => (
              <li
                key={w.id}
                style={{
                  breakInside: "avoid",
                  border: `1px solid ${PDF.line}`,
                  background: PDF.paperTint,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <PdfNumChip n={i + 1} size={20} />
                  <span style={{ fontFamily: PDF_FONT.chinese, fontSize: 22, fontWeight: 700, color: PDF.ink }}>{w.hanzi}</span>
                  <span style={{ fontFamily: PDF_FONT.pinyin, fontSize: 14, color: PDF.brand }}>{w.pinyin}</span>
                  <span style={{ fontSize: 14, color: PDF.ink2 }}>{w.meaning}</span>
                </div>
                {w.examples.length > 0 && (
                  <ul style={{ marginTop: 6, paddingLeft: 30, display: "flex", flexDirection: "column", gap: 3 }}>
                    {w.examples.map((ex, j) => (
                      <li key={j} style={{ fontSize: 13 }}>
                        <span style={{ fontFamily: PDF_FONT.chinese, color: PDF.ink }}>{ex.hanzi}</span>
                        {ex.pinyin && <span style={{ marginLeft: 6, fontFamily: PDF_FONT.pinyin, fontSize: 11.5, color: PDF.brand }}>{ex.pinyin}</span>}
                        {ex.meaning && <span style={{ marginLeft: 6, color: PDF.muted }}>— {ex.meaning}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </PdfSection>
    </PdfDocument>
  );
}
