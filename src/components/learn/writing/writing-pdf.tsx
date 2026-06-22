"use client";
import { PrintableDoc } from "@/components/learn/printable-doc";

interface Props {
  title: string;
  taskTypeLabel: string;
  hskLevel: string;
  prompt: string;
  promptZh?: string | null;
  minChars: number;
  timeLimit: number;
  backHref: string;
}

/** PDF viết luận: đề bài + yêu cầu (số chữ tối thiểu, thời gian) + khung làm bài. */
export function WritingPdf({ title, taskTypeLabel, hskLevel, prompt, promptZh, minChars, timeLimit, backHref }: Props) {
  return (
    <PrintableDoc title={title} subtitle={taskTypeLabel} hskLevel={hskLevel} backHref={backHref}>
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
            Tối thiểu {minChars} chữ
          </span>
          {timeLimit > 0 && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-600">
              {Math.round(timeLimit / 60)} phút
            </span>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Đề bài</div>
          <p className="mt-1 whitespace-pre-line text-[15px] text-zinc-900">{prompt}</p>
          {promptZh && <p className="mt-1 whitespace-pre-line font-chinese text-zinc-700">{promptZh}</p>}
        </div>

        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Phần làm bài</div>
          <div className="rounded-lg border border-dashed border-zinc-300" style={{ height: "16cm" }} />
        </div>
      </section>
    </PrintableDoc>
  );
}
