"use client";

export interface PdfQuestion {
  id: string;
  type: string;
  prompt: string;
  promptPinyin?: string | null;
  options?: unknown;
  correctAnswer: unknown;
  explanation?: string | null;
  supportingQuote?: string | null;
}

const OPT_LETTERS = ["A", "B", "C", "D", "E", "F"];

function optionTexts(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => {
    if (o && typeof o === "object" && "text" in o) return String((o as { text: unknown }).text);
    return String(o);
  });
}

function answerText(q: PdfQuestion, opts: string[]): string {
  // correctAnswer có thể là object {index|value|text|accepted}, hoặc (dữ liệu cũ)
  // là chuỗi / mảng. Cố gắng suy ra đáp án cho mọi dạng.
  const ca = q.correctAnswer;
  if (typeof ca === "string") return ca;
  if (Array.isArray(ca)) return ca.map(String).join(" / ");
  const o = (ca ?? {}) as { index?: number; value?: boolean; text?: string; accepted?: string[] };
  if (q.type === "MCQ" && typeof o.index === "number") return opts[o.index] ?? "";
  if (q.type === "TRUE_FALSE" && typeof o.value === "boolean") return o.value ? "Đúng" : "Sai";
  if (o.text) return o.text;
  if (Array.isArray(o.accepted) && o.accepted.length) return o.accepted.join(" / ");
  return "";
}

/** Bảng câu hỏi + đáp án (answer key) cho PDF Đọc/Nghe. */
export function PdfQuestionList({ questions }: { questions: PdfQuestion[] }) {
  if (questions.length === 0) {
    return <p className="text-sm text-zinc-500">Chưa có câu hỏi.</p>;
  }
  return (
    <ol className="space-y-3">
      {questions.map((q, i) => {
        const opts = optionTexts(q.options);
        const ans = answerText(q, opts);
        return (
          <li key={q.id} className="break-inside-avoid rounded-lg border border-zinc-200 p-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                {i + 1}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{q.type}</span>
            </div>
            <div className="font-chinese text-[15px] text-zinc-900">{q.prompt}</div>
            {q.promptPinyin && <div className="font-serif text-xs text-violet-600">{q.promptPinyin}</div>}
            {opts.length > 0 && (
              <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                {opts.map((o, oi) => (
                  <li key={oi} className="font-chinese text-zinc-700">
                    <span className="text-zinc-400">{OPT_LETTERS[oi] ?? oi + 1}.</span> {o}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 border-t border-dashed border-zinc-200 pt-2">
              <div className="text-sm">
                <span className="font-semibold text-green-700">Đáp án: </span>
                <span className="font-chinese">{ans || "— (xem trên dingdonghsk.com)"}</span>
              </div>
              {q.supportingQuote && (
                <div className="mt-0.5 text-[13px] text-emerald-700">
                  <span className="font-semibold">Dẫn chứng: </span>
                  <span className="font-chinese">{q.supportingQuote}</span>
                </div>
              )}
              {q.explanation && (
                <div className="mt-0.5 text-[13px] text-zinc-600">
                  <span className="font-semibold text-zinc-700">Giải thích: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
