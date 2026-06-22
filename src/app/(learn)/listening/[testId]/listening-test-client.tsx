"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock, Eye, EyeOff, Headphones, Info, RefreshCw, ListChecks, GraduationCap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestShell } from "@/components/learn/test-shell";
import { ReadingPalette } from "@/components/learn/reading/reading-palette";
import { QuestionCard } from "@/components/learn/reading/question-card";
import { ResultsSummary } from "@/components/learn/reading/results-summary";
import { ReviewDialog } from "@/components/learn/reading/review-dialog";
import { CharLookup, type LookupAnchor } from "@/components/learn/reading/char-lookup";
import { AudioPlayer } from "@/components/learn/listening/audio-player";
import { Tapescript } from "@/components/learn/listening/tapescript";
import { QuestionEvidence } from "@/components/learn/listening/question-evidence";
import { useListeningAudio } from "@/components/learn/listening/use-listening-audio";
import type { ListeningTestData } from "@/components/learn/listening/types";
import { splitTranscript, findEvidenceIndex } from "@/lib/transcript";
import { cn, formatDuration, hskBadgeClass, hskLevelLabel } from "@/lib/utils";
import { submitListeningAction } from "@/server/actions/listening";

const SAVED_KEY = "dingdong:listening:saved";
const isAnswered = (v: unknown) => v !== undefined && v !== null && v !== "";

interface SavedItem {
  testId: string;
  qid: string;
  prompt: string;
  explanation?: string | null;
  evidence?: string | null;
  savedAt: number;
}

type ReviewFilter = "all" | "wrong";

export function ListeningTestClient({ test }: { test: ListeningTestData; userId: string }) {
  const segments = useMemo(() => splitTranscript(test.transcript), [test.transcript]);
  const maxPlays = test.hskLevel === "HSK1" || test.hskLevel === "HSK2" ? 3 : 2;

  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState(0);
  const [showPinyin, setShowPinyin] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [lookup, setLookup] = useState<LookupAnchor | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [restored, setRestored] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);

  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoSubmitted = useRef(false);
  const storageKey = `dingdong:listening:${test.id}`;
  const total = test.questions.length;

  const audio = useListeningAudio({
    audioUrl: test.audioUrl,
    segments,
    maxPlays,
    reviewMode: submitted,
  });

  // Evidence: for each question, the transcript segment that justifies the answer.
  const evidenceByQid = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of test.questions) {
      map.set(q.id, findEvidenceIndex(segments, q));
    }
    return map;
  }, [test.questions, segments]);

  // Reverse index: segment → 1-based question numbers (for tapescript highlight).
  const evidenceMap = useMemo(() => {
    const map = new Map<number, number[]>();
    test.questions.forEach((q, idx) => {
      const seg = evidenceByQid.get(q.id);
      if (seg !== undefined && seg >= 0) {
        const arr = map.get(seg) ?? [];
        arr.push(idx + 1);
        map.set(seg, arr);
      }
    });
    return map;
  }, [test.questions, evidenceByQid]);

  // Restore in-progress work + saved-for-review list once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as {
          answers?: Record<string, unknown>;
          flags?: Record<string, boolean>;
          elapsed?: number;
        };
        if (s.answers) setAnswers(s.answers);
        if (s.flags) setFlags(s.flags);
        if (typeof s.elapsed === "number") setElapsed(s.elapsed);
      }
    } catch {
      /* ignore */
    }
    try {
      const rawSaved = localStorage.getItem(SAVED_KEY);
      if (rawSaved) {
        const list = JSON.parse(rawSaved) as SavedItem[];
        setSavedIds(new Set(list.filter((x) => x.testId === test.id).map((x) => x.qid)));
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, [storageKey, test.id]);

  // Autosave until submitted.
  useEffect(() => {
    if (!restored || submitted) return;
    if (Object.keys(answers).length === 0 && Object.keys(flags).length === 0 && elapsed === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, flags, elapsed }));
    } catch {
      /* ignore */
    }
  }, [answers, flags, elapsed, submitted, restored, storageKey]);

  // Elapsed clock.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  // Scroll a target question into view once its card is mounted.
  useEffect(() => {
    if (pendingScroll === null) return;
    const el = questionRefs.current[pendingScroll];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingScroll(null);
    }
  }, [pendingScroll, reviewFilter, submitted]);

  const remaining = Math.max(0, test.timeLimit - elapsed);

  // Auto-submit when the clock runs out (like a real exam).
  useEffect(() => {
    if (submitted || autoSubmitted.current || total === 0) return;
    if (remaining <= 0) {
      autoSubmitted.current = true;
      void doSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, submitted, total]);

  const answeredArr = useMemo(
    () => test.questions.map((q) => isAnswered(answers[q.id])),
    [test.questions, answers],
  );
  const flaggedArr = useMemo(() => test.questions.map((q) => !!flags[q.id]), [test.questions, flags]);
  const answeredCount = answeredArr.filter(Boolean).length;
  const unansweredIdx = answeredArr.map((a, i) => (a ? -1 : i)).filter((i) => i >= 0);
  const flaggedIdx = flaggedArr.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const correctnessArr = submitted ? test.questions.map((q) => result?.details[q.id]) : undefined;
  const correctCount = result ? Object.values(result.details).filter(Boolean).length : 0;
  const wrongCount = total - correctCount;

  function answer(qid: string, value: unknown) {
    if (submitted) return;
    setAnswers((a) => ({ ...a, [qid]: value }));
  }
  function toggleFlag(qid: string) {
    setFlags((f) => ({ ...f, [qid]: !f[qid] }));
  }

  function jump(i: number) {
    setCurrent(i);
    if (submitted) setReviewFilter("all");
    setPendingScroll(i);
  }

  async function doSubmit(auto = false) {
    if (submitting || submitted) return;
    setSubmitting(true);
    audio.stop();
    const res = await submitListeningAction({ testId: test.id, answers, durationSec: elapsed });
    setSubmitting(false);
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
      setReviewOpen(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      toast.success(auto ? `Hết giờ! Bạn đạt ${Math.round(res.result.score)}%` : `Bạn đạt ${Math.round(res.result.score)}%`);
    } else {
      toast.error("Lỗi nộp bài, thử lại sau");
    }
  }

  function toggleSave(qid: string) {
    let list: SavedItem[] = [];
    try {
      list = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedItem[];
    } catch {
      list = [];
    }
    const exists = list.some((x) => x.testId === test.id && x.qid === qid);
    if (exists) {
      list = list.filter((x) => !(x.testId === test.id && x.qid === qid));
    } else {
      const q = test.questions.find((x) => x.id === qid);
      const segIdx = evidenceByQid.get(qid);
      list.push({
        testId: test.id,
        qid,
        prompt: q?.prompt ?? "",
        explanation: q?.explanation ?? null,
        evidence: segIdx !== undefined && segIdx >= 0 ? segments[segIdx]?.text ?? null : null,
        savedAt: Date.now(),
      });
    }
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    setSavedIds(new Set(list.filter((x) => x.testId === test.id).map((x) => x.qid)));
  }

  const onCharClick = (char: string, pinyin: string, e: React.MouseEvent) =>
    setLookup({ char, pinyin, x: e.clientX, y: e.clientY });

  const timerCritical = !submitted && remaining <= 30;
  // Only fall back to revealing the transcript once we've settled the audio mode
  // (post-mount), so a no-MP3 test doesn't flash the tapescript before the
  // browser-TTS engine is detected.
  const showTranscriptDuringTest = restored && !submitted && audio.mode === "none" && segments.length > 0;
  // Neither audio nor transcript — an honest empty-state instead of telling the
  // learner to "read the transcript below" when there isn't one.
  const noContent = restored && audio.mode === "none" && segments.length === 0;

  return (
    <>
      <TestShell
        subtitle="Nghe hiểu · Luyện tập"
        backHref="/listening"
        onSubmit={() => setReviewOpen(true)}
        submitting={submitting}
        submitted={submitted}
        center={
          !submitted ? (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums",
                timerCritical ? "bg-rose-100 text-rose-700" : "bg-muted",
              )}
            >
              <Clock className={cn("h-4 w-4", timerCritical ? "text-rose-600" : "text-muted-foreground")} />
              {formatDuration(remaining)}
              <span className="hidden text-xs font-normal text-muted-foreground sm:inline">còn lại</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-sm font-bold text-emerald-700">
              {Math.round(result?.score ?? 0)}% · {correctCount}/{total}
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
                {submitted ? `${correctCount}/${total} đúng` : `${answeredCount}/${total} câu`}
              </span>
              <ReadingPalette
                total={total}
                answered={answeredArr}
                flagged={flaggedArr}
                current={current}
                correctness={correctnessArr}
                onJump={jump}
              />
            </div>
          ) : undefined
        }
      >
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
            {/* Title */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-teal-600" />
                <h1 className="text-lg font-bold sm:text-xl">{test.title}</h1>
              </div>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", hskBadgeClass(test.hskLevel))}>
                {hskLevelLabel(test.hskLevel)}
              </span>
            </div>

            {/* Sticky audio player */}
            <div className="sticky top-0 z-20 -mx-4 bg-[#faf7f2]/85 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
              <AudioPlayer audio={audio} reviewMode={submitted} segmentCount={segments.length} />
            </div>

            {/* Honest empty-state: neither audio nor transcript exists */}
            {noContent && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p>
                  Bài nghe này chưa có audio hoặc lời thoại. Bạn vẫn trả lời được câu hỏi, nhưng nên báo giáo viên bổ
                  sung nội dung.
                </p>
              </div>
            )}

            {/* Instructions (test mode) */}
            {!submitted && (
              <div className="flex items-start gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3 text-sm text-teal-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                <p>
                  {audio.available ? (
                    <>
                      Nghe audio (tối đa <b>{maxPlays}</b> lần) rồi trả lời tất cả câu hỏi.{" "}
                    </>
                  ) : (
                    <>Trả lời tất cả câu hỏi.{" "}</>
                  )}
                  {segments.length > 0 ? "Lời thoại & lời giải sẽ hiện sau khi nộp bài. " : "Lời giải sẽ hiện sau khi nộp bài. "}
                  Hết giờ bài sẽ tự nộp.
                </p>
              </div>
            )}

            {/* Fallback transcript when the device truly can't produce audio */}
            {showTranscriptDuringTest && (
              <Tapescript
                segments={segments}
                showPinyin={showPinyin}
                evidenceMap={new Map()}
                currentSegment={audio.currentSegment}
                canReplay={audio.canSpeakSegments}
                onPlaySegment={(i) => audio.speakSegment(i)}
                onCharClick={onCharClick}
              />
            )}

            {/* Results (review) */}
            {submitted && result && (
              <>
                <ResultsSummary
                  score={result.score}
                  correct={correctCount}
                  total={total}
                  level={test.hskLevel}
                  elapsedLabel={`${formatDuration(elapsed)} đã làm`}
                />
                <div className="flex gap-1.5">
                  <FilterButton active={reviewFilter === "all"} onClick={() => setReviewFilter("all")} label={`Tất cả · ${total}`} />
                  <FilterButton active={reviewFilter === "wrong"} onClick={() => setReviewFilter("wrong")} label={`Cần ôn · ${wrongCount}`} />
                </div>
              </>
            )}

            {/* Questions */}
            {total === 0 ? (
              <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                Bài nghe này chưa có câu hỏi.
              </p>
            ) : (
              <div className="space-y-3">
                {!submitted && (
                  <h2 className="flex items-center gap-2 text-base font-bold text-primary">
                    <ListChecks className="h-4 w-4" /> Câu hỏi ({total})
                  </h2>
                )}
                {test.questions.map((q, idx) => {
                  if (submitted && reviewFilter === "wrong" && result?.details[q.id]) return null;
                  const segIdx = evidenceByQid.get(q.id);
                  const evidenceSeg = segIdx !== undefined && segIdx >= 0 ? segments[segIdx] : null;
                  return (
                    <div key={q.id}>
                      <QuestionCard
                        question={q}
                        index={idx}
                        userAnswer={answers[q.id]}
                        onAnswer={(v) => answer(q.id, v)}
                        submitted={submitted}
                        isCorrect={result?.details[q.id]}
                        flagged={!!flags[q.id]}
                        onToggleFlag={() => toggleFlag(q.id)}
                        showPinyin={showPinyin}
                        isCurrent={current === idx}
                        onActivate={() => setCurrent(idx)}
                        cardRef={(el) => {
                          questionRefs.current[idx] = el;
                        }}
                      />
                      {submitted && (
                        <QuestionEvidence
                          segment={evidenceSeg ?? null}
                          showPinyin={showPinyin}
                          canReplay={audio.canSpeakSegments && segIdx !== undefined && segIdx >= 0}
                          onPlay={() => segIdx !== undefined && segIdx >= 0 && audio.speakSegment(segIdx)}
                          saved={savedIds.has(q.id)}
                          onToggleSave={() => toggleSave(q.id)}
                          onCharClick={onCharClick}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Review extras: tapescript + study actions */}
            {submitted && (
              <div className="space-y-4">
                <Tapescript
                  segments={segments}
                  showPinyin={showPinyin}
                  evidenceMap={evidenceMap}
                  currentSegment={audio.currentSegment}
                  canReplay={audio.canSpeakSegments}
                  onPlaySegment={(i) => audio.speakSegment(i)}
                  onCharClick={onCharClick}
                />

                <div className="rounded-2xl border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                    <GraduationCap className="h-4 w-4" /> Ôn tập
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {savedIds.size > 0
                      ? `Đã lưu ${savedIds.size} câu để ôn lại. `
                      : "Bấm “Lưu ôn tập” ở mỗi câu để xem lại sau. "}
                    Lọc “Cần ôn” để tập trung vào các câu còn sai.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        setReviewFilter("wrong");
                        toast.message("Đang lọc các câu cần ôn");
                      }}
                    >
                      <ListChecks className="h-4 w-4" /> Xem câu cần ôn ({wrongCount})
                    </Button>
                    <Button variant="outline" className="gap-1.5" onClick={() => window.location.reload()}>
                      <RefreshCw className="h-4 w-4" /> Làm lại từ đầu
                    </Button>
                    <Button asChild variant="ghost">
                      <Link href="/listening">Quay lại danh sách đề</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
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
      {lookup && <CharLookup anchor={lookup} onClose={() => setLookup(null)} />}
    </>
  );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:border-primary/40",
      )}
    >
      {label}
    </button>
  );
}
