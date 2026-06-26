"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, BookText, ListChecks, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { PrintFooter } from "@/components/learn/printable-doc";
import { cn, hskLevelLabel } from "@/lib/utils";
import { describeExercise } from "@/lib/grammar";
import type { GrammarLessonContent, Exercise, TheorySection } from "@/types";

interface Props {
  lessonTitle: string;
  unitTitle: string;
  unitTitleZh?: string;
  hskLevel: string;
  content: GrammarLessonContent;
  backHref: string;
}

type Scope = "both" | "theory" | "exercises";

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * Printable lesson handout. Shows a brand header (DingDong HSK logo), the full
 * theory of the lesson in order, and an exercise answer-key (quiz + flashcard
 * questions with their correct answer and explanation). The learner picks what
 * to include — theory only, exercises only, or both — then prints / saves as PDF
 * via the browser. No extra dependency: print CSS isolates `.print-document`.
 */
export function LessonPdf({ lessonTitle, unitTitle, unitTitleZh, hskLevel, content, backHref }: Props) {
  const [scope, setScope] = useState<Scope>("both");

  const sections = content.sections;
  // Every interactive item, in lesson order, flattened for the answer key.
  const exercises: Exercise[] = [...sections.flatMap((s) => s.exercises), ...content.test.questions];

  const showTheory = scope === "both" || scope === "theory";
  const showExercises = scope === "both" || scope === "exercises";
  const theoryCount = sections.filter((s) => s.structure || s.explanation || s.examples.length).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="no-print flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            <ScopeButton active={scope === "both"} onClick={() => setScope("both")} icon={Layers} label="Cả hai" />
            <ScopeButton active={scope === "theory"} onClick={() => setScope("theory")} icon={BookText} label="Lý thuyết" />
            <ScopeButton
              active={scope === "exercises"}
              onClick={() => setScope("exercises")}
              icon={ListChecks}
              label="Bài tập"
            />
          </div>
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Tải PDF
          </Button>
        </div>
      </div>
      <p className="no-print text-center text-xs text-muted-foreground">
        Bấm “Tải PDF”, sau đó chọn “Lưu thành PDF” (Save as PDF) trong hộp thoại in của trình duyệt.
      </p>

      {/* The printable document */}
      <div className="print-document rounded-2xl border bg-white p-6 text-[13px] leading-relaxed text-zinc-800 sm:p-10">
        {/* Brand header */}
        <header className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-3">
            <Logo className="h-12 w-12" />
            <div className="leading-tight">
              <div className="text-lg font-extrabold text-primary">DingDong HSK</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Học tiếng Trung
              </div>
            </div>
          </div>
          <div className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
            {hskLevelLabel(hskLevel)}
          </div>
        </header>

        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{unitTitle}</div>
          <h1 className="text-2xl font-bold text-zinc-900">{lessonTitle}</h1>
          {unitTitleZh && <p className="font-chinese text-zinc-500">{unitTitleZh}</p>}
        </div>

        {/* THEORY */}
        {showTheory && theoryCount > 0 && (
          <section className="mb-8 space-y-5">
            <h2 className="text-base font-bold text-violet-700">Phần 1 · Lý thuyết</h2>
            {sections.map((s, i) => (
              <TheoryBlock key={s.id || i} section={s} index={i} />
            ))}
          </section>
        )}

        {/* EXERCISES + ANSWER KEY */}
        {showExercises && exercises.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-base font-bold text-violet-700">
              {showTheory && theoryCount > 0 ? "Phần 2 · " : ""}Bài tập &amp; đáp án
            </h2>
            <ol className="space-y-3">
              {exercises.map((ex, i) => {
                const d = describeExercise(ex);
                return (
                  <li key={i} className="break-inside-avoid rounded-lg border border-zinc-200 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                        {i + 1}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                        {d.typeLabel}
                      </span>
                    </div>
                    <div className="font-chinese text-[15px] text-zinc-900">{d.question}</div>
                    {d.questionPinyin && <div className="text-xs text-zinc-500">{d.questionPinyin}</div>}
                    {d.options && d.options.length > 0 && (
                      <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {d.options.map((o, oi) => (
                          <li key={oi} className="font-chinese text-zinc-700">
                            <span className="text-zinc-400">{OPT_LETTERS[oi] ?? oi + 1}.</span> {o}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 border-t border-dashed border-zinc-200 pt-2">
                      <div className="text-sm">
                        <span className="font-semibold text-green-700">Đáp án: </span>
                        <span className="font-chinese">{d.answer}</span>
                      </div>
                      {d.explanation && (
                        <div className="mt-0.5 text-[13px] text-zinc-600">
                          <span className="font-semibold text-zinc-700">Giải thích: </span>
                          {d.explanation}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {((showTheory && theoryCount === 0) || sections.length === 0) && !showExercises && (
          <p className="text-sm text-zinc-500">Bài học này chưa có lý thuyết.</p>
        )}
        {showExercises && exercises.length === 0 && (
          <p className="text-sm text-zinc-500">Bài học này chưa có bài tập.</p>
        )}

        <PrintFooter />
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function TheoryBlock({ section, index }: { section: TheorySection; index: number }) {
  const breakdown = section.breakdown ?? [];
  const mistakes = section.mistakes ?? [];
  const hasBody =
    section.structure ||
    section.explanation ||
    section.examples.length ||
    breakdown.length ||
    section.usage ||
    mistakes.length;
  if (!hasBody) return null;
  return (
    <div className="break-inside-avoid space-y-2">
      <h3 className="font-bold text-zinc-900">
        {index + 1}. {section.title}
        {section.titleZh && <span className="ml-2 font-chinese text-violet-600">{section.titleZh}</span>}
      </h3>
      {section.structure && (
        <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-center font-chinese text-base font-bold text-violet-900">
          {section.structure}
        </div>
      )}
      {breakdown.length > 0 && (
        <table className="w-full border-collapse text-[13px]">
          <tbody>
            {breakdown.map((p, i) => (
              <tr key={i} className="border-b border-zinc-100 align-top">
                <td className="whitespace-nowrap py-1 pr-2 font-chinese font-bold text-zinc-900">{p.part}</td>
                <td className="whitespace-nowrap py-1 pr-2 font-serif text-violet-600">{p.pinyin}</td>
                <td className="whitespace-nowrap py-1 pr-2 text-zinc-500">{p.role}</td>
                <td className="py-1 text-zinc-700">{p.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {section.usage && (
        <p className="text-zinc-700">
          <span className="font-semibold text-sky-700">Khi nào dùng: </span>
          {section.usage}
        </p>
      )}
      {section.explanation && (
        <p className="whitespace-pre-line text-zinc-700">{section.explanation}</p>
      )}
      {mistakes.length > 0 && (
        <ul className="space-y-1">
          {mistakes.map((m, i) => (
            <li key={i} className="text-[13px] text-zinc-700">
              <span className="font-chinese text-red-600 line-through">{m.wrong}</span>
              <span className="mx-1">→</span>
              <span className="font-chinese font-semibold text-green-700">{m.right}</span>
              {m.note && <span className="text-zinc-500"> — {m.note}</span>}
            </li>
          ))}
        </ul>
      )}
      {section.examples.length > 0 && (
        <ul className="space-y-1.5">
          {section.examples.map((ex, i) => (
            <li key={i} className="rounded-md bg-zinc-50 px-3 py-2">
              {ex.situation && <div className="text-[11px] font-medium text-amber-600">{ex.situation}</div>}
              <div className="font-chinese text-[15px] text-zinc-900">{ex.hanzi}</div>
              <div className="font-serif text-xs text-violet-600">{ex.pinyin}</div>
              <div className="text-zinc-700">{ex.meaning}</div>
              {ex.note && <div className="mt-0.5 text-xs italic text-zinc-500">{ex.note}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
