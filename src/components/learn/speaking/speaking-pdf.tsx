import * as React from "react";
import { PdfDocument } from "@/components/learn/pdf/pdf-document";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";

interface Sentence {
  text: string;
  pinyin?: string;
}
interface Question {
  question: string;
  pinyin?: string;
}

interface Props {
  title: string;
  hskLevel: string;
  part1: Sentence[];
  part2: Sentence | null;
  part3: Question[];
}

function PartBlock({ n, label, labelZh, children }: { n: number; label: string; labelZh: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 16, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: PDF.brand,
            color: "#fff",
            fontSize: 12,
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {n}
        </span>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: PDF.brandDark }}>{label}</h2>
        <span style={{ fontFamily: PDF_FONT.chinese, fontSize: 12, color: PDF.faint }}>{labelZh}</span>
      </div>
      {children}
    </section>
  );
}

function SentenceRow({ n, text, pinyin }: { n: number; text: string; pinyin?: string }) {
  return (
    <li style={{ breakInside: "avoid", display: "flex", gap: 7, padding: "3px 0", alignItems: "baseline" }}>
      <span style={{ color: PDF.faint, fontWeight: 700, fontSize: 12, minWidth: 16 }}>{n}.</span>
      <span>
        <span style={{ fontFamily: PDF_FONT.chinese, fontSize: 15, color: PDF.ink }}>{text}</span>
        {pinyin && <span style={{ marginLeft: 8, fontFamily: PDF_FONT.pinyin, fontSize: 12, color: PDF.brand }}>{pinyin}</span>}
      </span>
    </li>
  );
}

/** PDF luyện nói (HSKK): 3 phần — lặp câu, đọc đoạn, trả lời câu hỏi. */
export function SpeakingPdf({ title, hskLevel, part1, part2, part3 }: Props) {
  return (
    <PdfDocument kicker="Luyện nói · 口语 (HSKK)" title={title} hskLevel={hskLevel}>
      {part1.length > 0 && (
        <PartBlock n={1} label="Lặp lại câu" labelZh="复述">
          <ol style={{ display: "flex", flexDirection: "column" }}>
            {part1.map((s, i) => (
              <SentenceRow key={i} n={i + 1} text={s.text} pinyin={s.pinyin} />
            ))}
          </ol>
        </PartBlock>
      )}
      {part2 && part2.text && (
        <PartBlock n={2} label="Đọc đoạn văn" labelZh="朗读">
          <div
            style={{
              borderRadius: 10,
              border: `1px solid ${PDF.line}`,
              borderLeft: `3px solid ${PDF.brand}`,
              background: PDF.paperTint,
              padding: "12px 14px",
            }}
          >
            <p style={{ whiteSpace: "pre-line", fontFamily: PDF_FONT.chinese, fontSize: 15, lineHeight: 1.9, color: PDF.ink }}>
              {part2.text}
            </p>
            {part2.pinyin && (
              <p style={{ whiteSpace: "pre-line", fontFamily: PDF_FONT.pinyin, fontSize: 12, lineHeight: 1.7, color: PDF.brand, marginTop: 6 }}>
                {part2.pinyin}
              </p>
            )}
          </div>
        </PartBlock>
      )}
      {part3.length > 0 && (
        <PartBlock n={3} label="Trả lời câu hỏi" labelZh="回答问题">
          <ol style={{ display: "flex", flexDirection: "column" }}>
            {part3.map((q, i) => (
              <SentenceRow key={i} n={i + 1} text={q.question} pinyin={q.pinyin} />
            ))}
          </ol>
        </PartBlock>
      )}
    </PdfDocument>
  );
}
