import * as React from "react";
import { PdfDocument, PdfSection, PdfNumChip, PdfTag, PdfAnswer, PdfAnswerLine } from "@/components/learn/pdf/pdf-document";
import { PDF, PDF_FONT } from "@/lib/pdf/theme";
import { describeExercise } from "@/lib/grammar";
import type { GrammarLessonContent, Exercise, TheorySection } from "@/types";

export type GrammarPdfScope = "both" | "theory" | "exercises";

interface Props {
  lessonTitle: string;
  unitTitle: string;
  unitTitleZh?: string | null;
  hskLevel: string;
  content: GrammarLessonContent;
  /** Phạm vi in: lý thuyết, bài tập, hoặc cả hai (mặc định). */
  scope?: GrammarPdfScope;
}

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * PDF bài ngữ pháp: lý thuyết đầy đủ (theo thứ tự bài) + đáp án bài tập (quiz +
 * flashcard kèm đáp án & giải thích). Phạm vi in chọn qua `scope`.
 */
export function LessonPdf({ lessonTitle, unitTitle, unitTitleZh, hskLevel, content, scope = "both" }: Props) {
  const sections = content.sections;
  const exercises: Exercise[] = [...sections.flatMap((s) => s.exercises), ...content.test.questions];

  const showTheory = scope === "both" || scope === "theory";
  const showExercises = scope === "both" || scope === "exercises";
  const theoryCount = sections.filter((s) => s.structure || s.explanation || s.examples.length).length;

  return (
    <PdfDocument kicker="Ngữ pháp · 语法" title={lessonTitle} subtitle={unitTitle} titleZh={unitTitleZh} hskLevel={hskLevel}>
      {showTheory && theoryCount > 0 && (
        <PdfSection title={`${showExercises ? "Phần 1 · " : ""}Lý thuyết`} titleZh="语法讲解">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sections.map((s, i) => (
              <TheoryBlock key={s.id || i} section={s} index={i} />
            ))}
          </div>
        </PdfSection>
      )}

      {showExercises && exercises.length > 0 && (
        <PdfSection title={`${showTheory && theoryCount > 0 ? "Phần 2 · " : ""}Bài tập & đáp án`} titleZh="练习与答案">
          <ol style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {exercises.map((ex, i) => {
              const d = describeExercise(ex);
              return (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <PdfNumChip n={i + 1} size={20} />
                    <PdfTag>{d.typeLabel}</PdfTag>
                  </div>
                  <div style={{ fontFamily: PDF_FONT.chinese, fontSize: 15, color: PDF.ink }}>{d.question}</div>
                  {d.questionPinyin && <div style={{ fontFamily: PDF_FONT.pinyin, fontSize: 12, color: PDF.brand, marginTop: 2 }}>{d.questionPinyin}</div>}
                  {d.options && d.options.length > 0 && (
                    <div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16, rowGap: 3 }}>
                      {d.options.map((o, oi) => (
                        <div key={oi} style={{ fontFamily: PDF_FONT.chinese, fontSize: 13, color: PDF.ink2 }}>
                          <span style={{ color: PDF.faint, fontWeight: 700 }}>{OPT_LETTERS[oi] ?? oi + 1}.</span> {o}
                        </div>
                      ))}
                    </div>
                  )}
                  <PdfAnswer>
                    <PdfAnswerLine>{d.answer}</PdfAnswerLine>
                    {d.explanation && (
                      <div style={{ marginTop: 3, fontSize: 12.5, color: PDF.ink2 }}>
                        <span style={{ fontWeight: 700, color: PDF.ink }}>Giải thích: </span>
                        {d.explanation}
                      </div>
                    )}
                  </PdfAnswer>
                </li>
              );
            })}
          </ol>
        </PdfSection>
      )}

      {showTheory && theoryCount === 0 && !showExercises && (
        <p style={{ fontSize: 13, color: PDF.muted }}>Bài học này chưa có lý thuyết.</p>
      )}
      {showExercises && exercises.length === 0 && (
        <p style={{ fontSize: 13, color: PDF.muted }}>Bài học này chưa có bài tập.</p>
      )}
    </PdfDocument>
  );
}

function TheoryBlock({ section, index }: { section: TheorySection; index: number }) {
  const breakdown = section.breakdown ?? [];
  const mistakes = section.mistakes ?? [];
  const hasBody =
    section.structure || section.explanation || section.examples.length || breakdown.length || section.usage || mistakes.length;
  if (!hasBody) return null;
  return (
    <div style={{ breakInside: "avoid", display: "flex", flexDirection: "column", gap: 7 }}>
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: PDF.ink }}>
        {index + 1}. {section.title}
        {section.titleZh && <span style={{ marginLeft: 8, fontFamily: PDF_FONT.chinese, fontWeight: 700, color: PDF.brand }}>{section.titleZh}</span>}
      </h3>
      {section.structure && (
        <div
          style={{
            borderRadius: 8,
            border: `1px solid ${PDF.brandSoftBorder}`,
            background: PDF.brandSoft,
            padding: "8px 12px",
            textAlign: "center",
            fontFamily: PDF_FONT.chinese,
            fontSize: 16,
            fontWeight: 700,
            color: PDF.brandDeep,
          }}
        >
          {section.structure}
        </div>
      )}
      {breakdown.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {breakdown.map((p, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${PDF.lineSoft}`, verticalAlign: "top" }}>
                <td style={{ whiteSpace: "nowrap", padding: "4px 8px 4px 0", fontFamily: PDF_FONT.chinese, fontWeight: 700, color: PDF.ink }}>{p.part}</td>
                <td style={{ whiteSpace: "nowrap", padding: "4px 8px 4px 0", fontFamily: PDF_FONT.pinyin, color: PDF.brand }}>{p.pinyin}</td>
                <td style={{ whiteSpace: "nowrap", padding: "4px 8px 4px 0", color: PDF.faint }}>{p.role}</td>
                <td style={{ padding: "4px 0", color: PDF.ink2 }}>{p.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {section.usage && (
        <p style={{ color: PDF.ink2 }}>
          <span style={{ fontWeight: 700, color: PDF.brandDark }}>Khi nào dùng: </span>
          {section.usage}
        </p>
      )}
      {section.explanation && <p style={{ whiteSpace: "pre-line", color: PDF.ink2 }}>{section.explanation}</p>}
      {mistakes.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {mistakes.map((m, i) => (
            <li key={i} style={{ fontSize: 13, color: PDF.ink2 }}>
              <span style={{ fontFamily: PDF_FONT.chinese, color: PDF.wrong, textDecoration: "line-through" }}>{m.wrong}</span>
              <span style={{ margin: "0 5px" }}>→</span>
              <span style={{ fontFamily: PDF_FONT.chinese, fontWeight: 700, color: PDF.correct }}>{m.right}</span>
              {m.note && <span style={{ color: PDF.muted }}> — {m.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {section.examples.length > 0 && (
        <ul style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {section.examples.map((ex, i) => (
            <li key={i} style={{ borderRadius: 8, background: "#f4f2e8", padding: "8px 12px" }}>
              {ex.situation && <div style={{ fontSize: 11, fontWeight: 700, color: PDF.gold }}>{ex.situation}</div>}
              <div style={{ fontFamily: PDF_FONT.chinese, fontSize: 15, color: PDF.ink }}>{ex.hanzi}</div>
              <div style={{ fontFamily: PDF_FONT.pinyin, fontSize: 12, color: PDF.brand }}>{ex.pinyin}</div>
              <div style={{ color: PDF.ink2 }}>{ex.meaning}</div>
              {ex.note && <div style={{ marginTop: 2, fontSize: 12, fontStyle: "italic", color: PDF.muted }}>{ex.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
