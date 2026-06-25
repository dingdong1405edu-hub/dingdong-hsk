"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Settings2,
  Clock,
  BookOpen,
  ListChecks,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TestShell } from "@/components/learn/test-shell";
import { cn, formatDuration } from "@/lib/utils";
import { submitReadingAction } from "@/server/actions/reading";
import { PassagePane } from "@/components/learn/reading/passage-pane";
import { QuestionCard } from "@/components/learn/reading/question-card";
import { ReadingPalette } from "@/components/learn/reading/reading-palette";
import { SettingsDialog } from "@/components/learn/reading/settings-dialog";
import { ReviewDialog } from "@/components/learn/reading/review-dialog";
import { ResultsSummary } from "@/components/learn/reading/results-summary";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { CharLookup, type LookupAnchor } from "@/components/learn/reading/char-lookup";
import { SelectionLookup, type SelectionAnchor } from "@/components/learn/reading/selection-lookup";
import { useReadingSettings } from "@/components/learn/reading/use-reading-settings";
import { toPinyinArray } from "@/lib/pinyin";
import type { ReadingTestData } from "@/components/learn/reading/types";

type Pane = "passage" | "questions";
type ReviewFilter = "all" | "wrong" | "flagged";
type ReadMode = "lookup" | "highlight";

const isAnswered = (v: unknown) => v !== undefined && v !== null && v !== "";

// Màu bút highlight — rgba bán trong suốt để đọc rõ trên cả nền sáng lẫn theme tối.
const HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: "Vàng", value: "rgba(250, 204, 21, 0.45)" },
  { name: "Lục", value: "rgba(74, 222, 128, 0.45)" },
  { name: "Lam", value: "rgba(96, 165, 250, 0.45)" },
  { name: "Hồng", value: "rgba(244, 114, 182, 0.45)" },
];

export function ReadingTestClient({
  test,
  onSubmit,
  backHref = "/reading",
}: {
  test: ReadingTestData;
  userId?: string;
  /** Nộp bài tuỳ biến (lộ trình). Nếu có → dùng thay submitReadingAction. */
  onSubmit?: (args: {
    answers: Record<string, unknown>;
    durationSec: number;
  }) => Promise<{ ok: boolean; result?: { score: number; details: Record<string, boolean> } }>;
  /** Đường dẫn nút "Thoát" (mặc định /reading). */
  backHref?: string;
}) {
  const { settings, setSettings } = useReadingSettings();
  const [showPinyin, setShowPinyin] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; details: Record<string, boolean> } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [current, setCurrent] = useState(0);
  const [tab, setTab] = useState<Pane>("passage");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [lookup, setLookup] = useState<LookupAnchor | null>(null);
  const [selection, setSelection] = useState<SelectionAnchor | null>(null);
  const [restored, setRestored] = useState(false);
  const [pendingScroll, setPendingScroll] = useState<number | null>(null);
  const [mode, setMode] = useState<ReadMode>("lookup");
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  // "Chỗ chứa đáp án" đang tô sáng trong đoạn văn (nonce đổi mỗi lần bấm để cuộn lại).
  const [evidence, setEvidence] = useState<{ indices: number[]; nonce: number } | null>(null);

  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const storageKey = `dingdong:reading:${test.id}`;
  // Highlight lưu riêng (không xoá khi nộp bài — là công cụ học tập, không phải đáp án).
  const hlKey = `dingdong:reading:hl:${test.id}`;
  // Index tô theo vị trí ký tự → lưu kèm độ dài đoạn văn để bỏ map cũ nếu admin sửa bài.
  const passageLen = test.passage.length;
  const total = test.questions.length;

  function applyHighlight(indices: number[], color: string) {
    setHighlights((h) => {
      const next = { ...h };
      for (const i of indices) next[i] = color;
      return next;
    });
  }
  function eraseHighlight(index: number) {
    setHighlights((h) => {
      if (!(index in h)) return h;
      const next = { ...h };
      delete next[index];
      return next;
    });
  }
  function toggleMode() {
    setMode((m) => {
      const next: ReadMode = m === "highlight" ? "lookup" : "highlight";
      if (next === "highlight") {
        // Đóng popup tra cứu đang mở để không lẫn với thao tác tô.
        setLookup(null);
        setSelection(null);
      }
      return next;
    });
  }

  // Phân đoạn đoạn văn ĐÚNG như PinyinText (cùng toPinyinArray) để map trích dẫn của
  // câu hỏi về chính các segment index mà PinyinText gắn data-idx.
  const passageSegments = useMemo(() => toPinyinArray(test.passage), [test.passage]);
  const segOffsets = useMemo(() => {
    const offs: number[] = [];
    let acc = 0;
    for (const s of passageSegments) {
      offs.push(acc);
      acc += s.char.length;
    }
    return offs;
  }, [passageSegments]);
  const joinedPassage = useMemo(
    () => passageSegments.map((s) => s.char).join("").normalize("NFC"),
    [passageSegments],
  );

  // Tìm các segment trong đoạn văn ứng với "supportingQuote" (trích nguyên văn).
  function locateEvidence(quote: string): number[] {
    const q = quote.normalize("NFC").trim();
    if (!q) return [];
    const TRIM = /^[\s，。、？！：；,.!?"'“”‘’()（）【】「」]+|[\s，。、？！：；,.!?"'“”‘’()（）【】「」]+$/g;
    let pos = joinedPassage.indexOf(q);
    let len = q.length;
    if (pos < 0) {
      // AI đôi khi thêm/thiếu dấu câu ở hai đầu — thử lại với phần lõi.
      const core = q.replace(TRIM, "");
      if (core && core !== q) {
        pos = joinedPassage.indexOf(core);
        len = core.length;
      }
    }
    if (pos < 0) return [];
    const end = pos + len;
    const indices: number[] = [];
    for (let i = 0; i < passageSegments.length; i++) {
      const segStart = segOffsets[i];
      const segEnd = segStart + passageSegments[i].char.length;
      if (segStart < end && segEnd > pos) indices.push(i);
    }
    return indices;
  }

  function showEvidence(quote?: string | null) {
    if (!quote) return;
    const indices = locateEvidence(quote);
    if (indices.length === 0) {
      toast.message("Không định vị được trích dẫn trong đoạn văn.");
      return;
    }
    setEvidence((e) => ({ indices, nonce: (e?.nonce ?? 0) + 1 }));
    setTab("passage"); // điện thoại/iPad dọc: chuyển sang xem đoạn văn để thấy chỗ tô
  }

  // Restore in-progress work (answers / flags / elapsed) once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as { answers?: Record<string, unknown>; flags?: Record<string, boolean>; elapsed?: number };
        if (s.answers) setAnswers(s.answers);
        if (s.flags) setFlags(s.flags);
        if (typeof s.elapsed === "number") setElapsed(s.elapsed);
      }
      const rawHl = localStorage.getItem(hlKey);
      if (rawHl) {
        const saved = JSON.parse(rawHl) as { len?: number; map?: Record<string, string> };
        // Chỉ khôi phục khi đoạn văn chưa đổi độ dài (tránh tô nhầm ký tự sau khi admin sửa bài).
        if (saved && typeof saved === "object" && saved.map && saved.len === passageLen) {
          setHighlights(saved.map as Record<number, string>);
        } else {
          localStorage.removeItem(hlKey);
        }
      }
    } catch {
      /* ignore */
    }
    setRestored(true);
  }, [storageKey, hlKey, passageLen]);

  // Lưu highlight độc lập với bài làm; xoá key khi không còn highlight nào.
  useEffect(() => {
    if (!restored) return;
    try {
      if (Object.keys(highlights).length === 0) localStorage.removeItem(hlKey);
      else localStorage.setItem(hlKey, JSON.stringify({ len: passageLen, map: highlights }));
    } catch {
      /* ignore */
    }
  }, [highlights, restored, hlKey, passageLen]);

  // Autosave until submitted. Gated on `restored` (a committed state flag, not a
  // ref) so the first run can't clobber just-restored progress with empty
  // defaults; skips writing the empty initial state entirely.
  useEffect(() => {
    if (!restored || submitted) return;
    if (Object.keys(answers).length === 0 && Object.keys(flags).length === 0 && elapsed === 0) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, flags, elapsed }));
    } catch {
      /* ignore */
    }
  }, [answers, flags, elapsed, submitted, restored, storageKey]);

  // Scroll to a target question once its card is actually in the DOM — robust to
  // the mobile tab switch and review-filter remounts (no magic timeout).
  useEffect(() => {
    if (pendingScroll === null) return;
    const el = questionRefs.current[pendingScroll];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingScroll(null);
    }
  }, [pendingScroll, tab, reviewFilter, submitted]);

  // Elapsed clock.
  useEffect(() => {
    if (submitted) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [submitted]);

  const answeredArr = useMemo(() => test.questions.map((q) => isAnswered(answers[q.id])), [test.questions, answers]);
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
    setTab("questions");
    setPendingScroll(i);
  }

  async function handleSubmit() {
    if (submitting || submitted) return; // re-entrancy guard (no duplicate Attempt/XP)
    setSubmitting(true);
    const res = onSubmit
      ? await onSubmit({ answers, durationSec: elapsed })
      : await submitReadingAction({ testId: test.id, answers, durationSec: elapsed });
    setSubmitting(false);
    if (res.ok && res.result) {
      setResult(res.result);
      setSubmitted(true);
      setReviewOpen(false);
      setTab("questions"); // reveal graded results on the tabbed (mobile/iPad) layout
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      toast.success(`Bạn đạt ${Math.round(res.result.score)}%`);
    } else {
      toast.error("Lỗi nộp bài, thử lại sau");
    }
  }

  const overTime = elapsed > test.timeLimit;

  return (
    <>
      <TestShell
        subtitle="Đọc hiểu · Luyện tập"
        backHref={backHref}
        onSubmit={() => setReviewOpen(true)}
        submitting={submitting}
        submitted={submitted}
        center={
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold tabular-nums",
              overTime ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : "bg-muted",
            )}
          >
            <Clock className={cn("h-4 w-4", overTime ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground")} />
            {formatDuration(elapsed)}
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              / đề xuất {formatDuration(test.timeLimit)}
            </span>
          </span>
        }
        tools={
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-lg"
              onClick={() => setSettingsOpen(true)}
              aria-label="Tuỳ chỉnh đọc"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden lg:inline">Cỡ chữ</span>
            </Button>
            <Button
              size="sm"
              variant={showPinyin ? "default" : "outline"}
              className="gap-1.5 rounded-lg"
              onClick={() => setShowPinyin((v) => !v)}
            >
              {showPinyin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              <span className="hidden lg:inline">Pinyin</span>
            </Button>
            <Button
              size="sm"
              variant={mode === "highlight" ? "default" : "outline"}
              className="gap-1.5 rounded-lg"
              onClick={toggleMode}
              aria-label="Bút tô màu"
            >
              <Highlighter className="h-4 w-4" />
              <span className="hidden lg:inline">Bút</span>
            </Button>
            {mode === "highlight" && (
              <div className="flex items-center gap-1 rounded-lg border bg-card/70 px-1.5 py-1">
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setHighlightColor(c.value)}
                    aria-label={`Màu ${c.name}`}
                    title={c.name}
                    className={cn(
                      "h-5 w-5 rounded-full border-2 transition-transform",
                      highlightColor === c.value ? "scale-110 border-foreground" : "border-black/10 dark:border-white/20",
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setHighlights({})}
                  disabled={Object.keys(highlights).length === 0}
                  aria-label="Xoá hết tô"
                  title="Xoá hết tô"
                  className="ml-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        }
        nav={
          <div className="flex items-center gap-2">
            <span className="hidden shrink-0 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary sm:inline">
              {answeredCount}/{total} câu
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
        }
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Segmented passage/questions switch — phones & iPad portrait */}
          <div className="flex shrink-0 gap-1 border-b bg-card/80 p-1.5 backdrop-blur lg:hidden">
            <SegButton active={tab === "passage"} onClick={() => setTab("passage")} icon={BookOpen} label="Đoạn văn" />
            <SegButton
              active={tab === "questions"}
              onClick={() => setTab("questions")}
              icon={ListChecks}
              label={`Câu hỏi ${answeredCount}/${total}`}
            />
          </div>

          {/* Panes: split on lg+, single (tabbed) below */}
          <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
            <div className={cn("h-full min-h-0", tab === "passage" ? "block" : "hidden", "lg:block")}>
              <PassagePane
                test={test}
                showPinyin={showPinyin}
                settings={settings}
                mode={mode}
                highlightColor={highlightColor}
                highlights={highlights}
                onCharClick={(char, pinyin, e) => {
                  setSelection(null);
                  setLookup({ char, pinyin, x: e.clientX, y: e.clientY });
                }}
                onSelectText={(text, x, y) => {
                  setLookup(null);
                  setSelection({ text, x, y });
                }}
                onHighlight={applyHighlight}
                onEraseHighlight={eraseHighlight}
                evidence={evidence}
              />
            </div>

            <div className="hidden bg-border lg:block" />

            <div className={cn("h-full min-h-0", tab === "questions" ? "block" : "hidden", "lg:block")}>
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 items-center justify-between border-b bg-card/70 px-4 py-2 backdrop-blur">
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Câu hỏi · {total}
                  </span>
                  {submitted ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {Math.round(result?.score ?? 0)}% · {correctCount}/{total}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => jump(Math.max(0, current - 1))}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        disabled={current === 0}
                        aria-label="Câu trước"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {current + 1}/{total}
                      </span>
                      <button
                        onClick={() => jump(Math.min(total - 1, current + 1))}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-40"
                        disabled={current === total - 1}
                        aria-label="Câu sau"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {submitted && result && (
                    <>
                      <BaoBuddy
                        size={84}
                        pose={result.score >= 50 ? "cheer" : "idle"}
                        message={result.score >= 50 ? "做得好!" : "加油!"}
                        className="mx-auto"
                      />
                      <ResultsSummary
                        score={result.score}
                        correct={correctCount}
                        total={total}
                        level={test.hskLevel}
                        elapsedLabel={`${formatDuration(elapsed)} đã làm`}
                      />
                      <div className="flex gap-1.5">
                        <FilterButton active={reviewFilter === "all"} onClick={() => setReviewFilter("all")} label={`Tất cả · ${total}`} />
                        <FilterButton active={reviewFilter === "wrong"} onClick={() => setReviewFilter("wrong")} label={`Sai · ${wrongCount}`} />
                        <FilterButton active={reviewFilter === "flagged"} onClick={() => setReviewFilter("flagged")} label={`Cờ · ${flaggedIdx.length}`} />
                      </div>
                    </>
                  )}

                  {test.questions.map((q, idx) => {
                    if (submitted && reviewFilter === "wrong" && result?.details[q.id]) return null;
                    if (submitted && reviewFilter === "flagged" && !flags[q.id]) return null;
                    return (
                      <QuestionCard
                        key={q.id}
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
                        onShowEvidence={() => showEvidence(q.supportingQuote)}
                        cardRef={(el) => {
                          questionRefs.current[idx] = el;
                        }}
                      />
                    );
                  })}

                  {submitted && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={backHref}>Quay lại danh sách đề</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TestShell>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} settings={settings} onChange={setSettings} />
      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        total={total}
        answeredCount={answeredCount}
        unanswered={unansweredIdx}
        flagged={flaggedIdx}
        onJump={jump}
        onConfirm={handleSubmit}
        submitting={submitting}
      />
      {lookup && <CharLookup anchor={lookup} onClose={() => setLookup(null)} source={`reading:${test.id}`} />}
      {selection && (
        <SelectionLookup anchor={selection} onClose={() => setSelection(null)} source={`reading:${test.id}`} />
      )}
    </>
  );
}

function SegButton({
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
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
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
