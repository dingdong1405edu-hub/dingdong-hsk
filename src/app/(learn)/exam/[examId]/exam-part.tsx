"use client";
import type { HSKLevel, Skill } from "@prisma/client";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PinyinText } from "@/components/learn/pinyin-text";
import { QuestionCard } from "@/components/learn/reading/question-card";
import type { ReadingQuestion } from "@/components/learn/reading/types";
import { countChineseChars } from "@/lib/utils";
import { Info, PenLine, Languages } from "lucide-react";
import type { WritingGradeResult } from "@/lib/groq";
import type { ExamPartData } from "./types";
import { ExamAudio } from "./exam-audio";

type EssayResult = WritingGradeResult | { ungraded: true };

const CRITERIA_LABELS: Record<string, string> = {
  taskResponse: "Bám sát đề",
  grammar: "Ngữ pháp 语法",
  vocabulary: "Từ vựng 词汇",
  coherence: "Mạch lạc 连贯",
};

interface ExamPartProps {
  part: ExamPartData;
  skill: Skill;
  hskLevel: HSKLevel;
  partLabel: string;
  globalIndexOf: (qid: string) => number;
  answers: Record<string, unknown>;
  onAnswer: (qid: string, v: unknown) => void;
  flags: Record<string, boolean>;
  onToggleFlag: (qid: string) => void;
  currentQid: string | null;
  onActivate: (globalIdx: number) => void;
  submitted: boolean;
  details: Record<string, boolean>;
  essays: Record<string, string>;
  onEssayChange: (partId: string, v: string) => void;
  essayResults: Record<string, EssayResult>;
  showPinyin: boolean;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
  registerRef: (qid: string, el: HTMLDivElement | null) => void;
}

export function ExamPart(props: ExamPartProps) {
  const { part, skill, hskLevel, partLabel, submitted, showPinyin, onCharClick } = props;
  const isEssay = !!part.writingPrompt;

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      {/* Part header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
          {partLabel}
        </span>
      </div>
      {part.instructions && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/60 p-3 text-sm text-sky-900 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
          <p className="whitespace-pre-line font-chinese">{part.instructions}</p>
        </div>
      )}

      {part.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={part.imageUrl} alt="" className="max-h-72 w-full rounded-xl object-contain" />
      )}

      {/* Listening: audio per part */}
      {skill === "LISTENING" && (
        <ExamAudio
          audioUrl={part.audioUrl}
          transcript={part.transcript}
          hskLevel={hskLevel}
          submitted={submitted}
          showPinyin={showPinyin}
          onCharClick={onCharClick}
        />
      )}

      {/* Reading: passage */}
      {skill === "READING" && part.passage && (
        <div className="rounded-xl border bg-[#fbf9f4] p-4 dark:bg-muted">
          <div className="font-chinese text-[17px] leading-loose">
            <PinyinText text={part.passage} showPinyin={showPinyin} onWordClick={onCharClick} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Languages className="h-3.5 w-3.5" /> Nhấn vào từng chữ để xem pinyin, nghĩa &amp; lưu sổ từ.
          </p>
        </div>
      )}

      {/* Writing: essay textarea + AI feedback */}
      {isEssay && (
        <EssayBlock
          part={part}
          value={props.essays[part.id] ?? ""}
          onChange={(v) => props.onEssayChange(part.id, v)}
          submitted={submitted}
          result={props.essayResults[part.id]}
        />
      )}

      {/* Questions */}
      {part.questions.length > 0 && (
        <div className="space-y-3">
          {part.questions.map((q) => {
            const gi = props.globalIndexOf(q.id);
            return (
              <QuestionCard
                key={q.id}
                question={q as ReadingQuestion}
                index={gi}
                userAnswer={props.answers[q.id]}
                onAnswer={(v) => props.onAnswer(q.id, v)}
                submitted={submitted}
                isCorrect={props.details[q.id]}
                flagged={!!props.flags[q.id]}
                onToggleFlag={() => props.onToggleFlag(q.id)}
                showPinyin={showPinyin}
                isCurrent={props.currentQid === q.id}
                onActivate={() => props.onActivate(gi)}
                cardRef={(el) => props.registerRef(q.id, el)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

function EssayBlock({
  part,
  value,
  onChange,
  submitted,
  result,
}: {
  part: ExamPartData;
  value: string;
  onChange: (v: string) => void;
  submitted: boolean;
  result: EssayResult | undefined;
}) {
  const charCount = countChineseChars(value);
  const minChars = part.writingMinChars ?? 0;
  const progress = minChars > 0 ? Math.min(100, Math.round((charCount / minChars) * 100)) : 0;

  return (
    <div className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4 dark:border-violet-400/25 dark:bg-violet-500/10">
      <div className="flex items-center gap-2 text-sm font-bold text-violet-700 dark:text-violet-300">
        <PenLine className="h-4 w-4" /> Bài viết
      </div>
      <p className="whitespace-pre-line text-sm">{part.writingPrompt}</p>

      {!submitted ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-48 font-chinese text-base"
            placeholder="Viết bài của bạn ở đây..."
          />
          {minChars > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{charCount} chữ Hán</span>
                <span>Tối thiểu: {minChars}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </>
      ) : (
        <EssayFeedback value={value} result={result} />
      )}
    </div>
  );
}

function EssayFeedback({ value, result }: { value: string; result: EssayResult | undefined }) {
  if (!result || "ungraded" in result) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border bg-card p-3 font-chinese text-sm leading-relaxed">
          {value || <span className="text-muted-foreground">(Bạn chưa viết bài này)</span>}
        </div>
        {result && "ungraded" in result && (
          <p className="text-xs text-amber-600 dark:text-amber-300">
            Bài viết đã lưu nhưng chưa chấm được bằng AI (thiếu cấu hình chấm điểm).
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Kết quả phần viết</span>
        <span className="text-2xl font-bold text-violet-700 dark:text-violet-300">{result.score}/100</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(result.criteria ?? {}).map(([key, val]) => {
          if (!val) return null;
          return (
            <div key={key} className="rounded-lg border bg-card p-2">
              <div className="text-[11px] text-muted-foreground">{CRITERIA_LABELS[key] ?? key}</div>
              <div className="text-lg font-bold">{val.score}</div>
            </div>
          );
        })}
      </div>
      {result.annotations?.length > 0 && (
        <div className="space-y-2">
          {result.annotations.map((a, i) => (
            <div key={i} className="rounded-lg border bg-card p-2 text-sm">
              <span className="font-chinese text-rose-600 line-through dark:text-rose-400">{a.original}</span>
              <span className="mx-1">→</span>
              <span className="font-chinese font-semibold text-emerald-700 dark:text-emerald-300">{a.correction}</span>
              {a.explanation && <p className="mt-1 text-xs text-muted-foreground">{a.explanation}</p>}
            </div>
          ))}
        </div>
      )}
      {result.correctedVersion && (
        <div>
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Bài sửa</div>
          <div className="rounded-lg bg-emerald-50 p-3 font-chinese text-sm leading-relaxed dark:bg-emerald-500/10">
            {result.correctedVersion}
          </div>
        </div>
      )}
      {result.overallFeedback && (
        <p className="rounded-lg bg-muted p-3 text-sm">{result.overallFeedback}</p>
      )}
    </div>
  );
}
