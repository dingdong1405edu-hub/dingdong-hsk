"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Eye, EyeOff, Headphones, BookText, PenLine, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestShell, QuestionNavBar } from "@/components/learn/test-shell";
import { ReviewDialog } from "@/components/learn/reading/review-dialog";
import { CharLookup, type LookupAnchor } from "@/components/learn/reading/char-lookup";
import { cn, formatDuration, hskLevelLabel } from "@/lib/utils";
import { sectionLabel } from "@/lib/mock-exam";
import { submitMockExamAction, type ExamGradeResult } from "@/server/actions/exam-submit";
import type { ExamData } from "./types";
import { ExamPart } from "./exam-part";
import { ExamResults } from "./exam-results";
import type { Skill } from "@prisma/client";

const isAnswered = (v: unknown) => v !== undefined && v !== null && v !== "";

function SectionIcon({ skill, className }: { skill: Skill; className?: string }) {
  if (skill === "LISTENING") return <Headphones className={className} />;
  if (skill === "READING") return <BookText className={className} />;
  return <PenLine className={className} />;
}

export function MockExamClient({ exam }: { exam: ExamData }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [essays, setEssays] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ExamGradeResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [current, setCurrent] = useState(0);
  const [showPinyin, setShowPinyin] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [lookup, setLookup] = useState<LookupAnchor | null>(null);
  const [restored, setRestored] = useState(false);
  const [pendingScrollQid, setPendingScrollQid] = useState<string | null>(null);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const autoSubmitted = useRef(false);
  const storageKey = `dingdong:exam:${exam.id}`;

  // Danh sách câu hỏi phẳng (theo đúng thứ tự đề) cho thanh điều hướng + đánh số liên tục.
  const flat = useMemo(() => {
    const out: { qid: string; sectionIdx: number }[] = [];
    exam.sections.forEach((section, si) => {
      for (const part of section.parts) {
        for (const q of part.questions) out.push({ qid: q.id, sectionIdx: si });
      }
    });
    return out;
  }, [exam.sections]);

  const indexByQid = useMemo(() => {
    const m: Record<string, number> = {};
    flat.forEach((f, i) => (m[f.qid] = i));
    return m;
  }, [flat]);

  const total = flat.length;
  const hasLimit = exam.totalTime != null && exam.totalTime > 0;
  const remaining = hasLimit ? Math.max(0, (exam.totalTime as number) - elapsed) : null;

  // Khôi phục bài đang làm dở.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as {
          answers?: Record<string, unknown>;
          essays?: Record<string, string>;
          flags?: Record<string, boolean>;
          elapsed?: number;
        };
        if (s.answers) setAnswers(s.answers);
        if (s.essays) setEssays(s.essays);
        if (s.flags) setFlags(s.flags);
        if (typeof s.elapsed === "number") setElapsed(s.elapsed);
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, [storageKey]);

  // Tự lưu cho tới khi nộp.
  useEffect(() => {
    if (!restored || submitted) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, essays, flags, elapsed }));
    } catch {
      /* ignore */
    }
  }, [answers, essays, flags, elapsed, submitted, restored, storageKey]);

  // Đồng hồ.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  // Hết giờ → tự nộp (như thi thật).
  useEffect(() => {
    if (!hasLimit || submitted || autoSubmitted.current) return;
    if (remaining !== null && remaining <= 0) {
      autoSubmitted.current = true;
      void doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, hasLimit, submitted]);

  // Cuộn tới câu mục tiêu sau khi phần chứa nó đã hiển thị.
  useEffect(() => {
    if (!pendingScrollQid) return;
    const el = questionRefs.current[pendingScrollQid];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingScrollQid(null);
    }
  }, [pendingScrollQid, activeSection, submitted]);

  const answeredArr = useMemo(() => flat.map((f) => isAnswered(answers[f.qid])), [flat, answers]);
  const flaggedArr = useMemo(() => flat.map((f) => !!flags[f.qid]), [flat, flags]);
  const answeredCount = answeredArr.filter(Boolean).length;
  const unansweredIdx = answeredArr.map((a, i) => (a ? -1 : i)).filter((i) => i >= 0);
  const flaggedIdx = flaggedArr.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const correctnessArr = submitted && result ? flat.map((f) => result.details[f.qid]) : undefined;
  const currentQid = flat[current]?.qid ?? null;

  function answer(qid: string, v: unknown) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: v }));
  }
  function toggleFlag(qid: string) {
    setFlags((f) => ({ ...f, [qid]: !f[qid] }));
  }
  function jump(i: number) {
    const fq = flat[i];
    if (!fq) return;
    setCurrent(i);
    setActiveSection(fq.sectionIdx);
    setPendingScrollQid(fq.qid);
  }

  async function doSubmit(auto = false) {
    if (submitting || submitted) return;
    setSubmitting(true);
    const res = await submitMockExamAction({ examId: exam.id, answers, essays, durationSec: elapsed });
    setSubmitting(false);
    if (res.ok) {
      setResult(res.result);
      setSubmitted(true);
      setReviewOpen(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      toast.success(
        `${auto ? "Hết giờ! " : ""}${res.result.passed ? "Đạt" : "Chưa đạt"} · ${res.result.overall}/100`,
      );
    } else {
      toast.error(res.error || "Lỗi nộp bài, thử lại sau");
    }
  }

  const onCharClick = (char: string, pinyin: string, e: React.MouseEvent) =>
    setLookup({ char, pinyin, x: e.clientX, y: e.clientY });

  const timerCritical = hasLimit && !submitted && remaining !== null && remaining <= 30;

  return (
    <>
      <TestShell
        subtitle={`Thi thử · ${hskLevelLabel(exam.hskLevel)}`}
        backHref="/exam"
        submitting={submitting}
        submitted={submitted}
        onSubmit={() => setReviewOpen(true)}
        center={
          submitted ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {result?.overall ?? 0}/100
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums",
                timerCritical ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-muted",
              )}
            >
              <Clock className={cn("h-4 w-4", timerCritical ? "text-rose-600 dark:text-rose-300" : "text-muted-foreground")} />
              {hasLimit ? formatDuration(remaining as number) : formatDuration(elapsed)}
              <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                {hasLimit ? "còn lại" : "đã làm"}
              </span>
            </span>
          )
        }
        tools={
          <Button
            size="sm"
            variant={showPinyin ? "default" : "outline"}
            className="gap-1.5 rounded-lg"
            onClick={() => setShowPinyin((v) => !v)}
          >
            {showPinyin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden lg:inline">Pinyin</span>
          </Button>
        }
        nav={
          total > 0 ? (
            <div className="flex items-center gap-2">
              <span className="hidden shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary sm:inline">
                {submitted ? `${result?.overall ?? 0}/100` : `${answeredCount}/${total} câu`}
              </span>
              <QuestionNavBar
                partLabel={sectionLabel(exam.sections[activeSection].skill, exam.sections[activeSection].title)}
                total={total}
                answered={answeredArr}
                current={current}
                correctness={correctnessArr}
                onJump={jump}
              />
            </div>
          ) : undefined
        }
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Section tabs */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b bg-card/80 p-1.5 backdrop-blur">
            {exam.sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(i)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  activeSection === i
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <SectionIcon skill={s.skill} className="h-4 w-4" />
                {sectionLabel(s.skill, s.title)}
                {submitted && result?.sections[i]?.score !== null && (
                  <span className="rounded-full bg-black/10 px-1.5 text-xs dark:bg-white/15">
                    {result?.sections[i]?.score}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
              {/* Title + results */}
              {!submitted ? (
                <div>
                  <h1 className="text-lg font-bold sm:text-xl">{exam.title}</h1>
                  {exam.titleZh && <p className="font-chinese text-sm text-muted-foreground">{exam.titleZh}</p>}
                </div>
              ) : (
                result && (
                  <ExamResults result={result} elapsedLabel={`${formatDuration(elapsed)} đã làm`} />
                )
              )}

              {/* Sections (all mounted, only active shown — giữ play-count audio & đáp án) */}
              {exam.sections.map((section, si) => (
                <div key={section.id} className={cn("space-y-4", activeSection === si ? "block" : "hidden")}>
                  {section.instructions && (
                    <p className="rounded-xl border bg-muted/40 p-3 text-sm font-chinese">{section.instructions}</p>
                  )}
                  {section.parts.map((part, pi) => (
                    <ExamPart
                      key={part.id}
                      part={part}
                      skill={section.skill}
                      hskLevel={exam.hskLevel}
                      partLabel={part.title || `Tiểu phần ${pi + 1}`}
                      globalIndexOf={(qid) => indexByQid[qid] ?? 0}
                      answers={answers}
                      onAnswer={answer}
                      flags={flags}
                      onToggleFlag={toggleFlag}
                      currentQid={currentQid}
                      onActivate={(gi) => setCurrent(gi)}
                      submitted={submitted}
                      details={result?.details ?? {}}
                      essays={essays}
                      onEssayChange={(pid, v) => setEssays((e) => ({ ...e, [pid]: v }))}
                      essayResults={result?.essays ?? {}}
                      showPinyin={showPinyin}
                      onCharClick={onCharClick}
                      registerRef={(qid, el) => {
                        questionRefs.current[qid] = el;
                      }}
                    />
                  ))}
                </div>
              ))}

              {submitted && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button variant="outline" className="gap-1.5" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" /> Làm lại từ đầu
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href="/exam">Quay lại danh sách đề</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </TestShell>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        total={total}
        answeredCount={answeredCount}
        unanswered={unansweredIdx}
        flagged={flaggedIdx}
        onJump={jump}
        onConfirm={() => doSubmit(false)}
        submitting={submitting}
      />
      {lookup && <CharLookup anchor={lookup} onClose={() => setLookup(null)} source={`exam:${exam.id}`} />}
    </>
  );
}
