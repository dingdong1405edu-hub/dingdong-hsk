"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { countChineseChars } from "@/lib/utils";
import { getTone } from "@/lib/pinyin";
import {
  isDue,
  ratingToQuality,
  correctnessToQuality,
  type SrsRating,
} from "@/lib/srs";
import { reviewWordAction } from "@/server/actions/vocab-review";
import { McqCard, type OptionKind } from "./mcq-card";
import { SrsFlashcard } from "./srs-flashcard";
import { MatchGame } from "./match-game";
import type { VocabWordCard, WordReviewState } from "@/types";

interface Props {
  /** Các từ ứng viên cho phiên ôn (từ của bài, hoặc tổng hợp đến hạn). */
  words: VocabWordCard[];
  /** Trạng thái SRS hiện tại của từng từ. */
  reviews: WordReviewState[];
  /** Kho từ để lấy đáp án nhiễu (mặc định = words). */
  pool?: VocabWordCard[];
  title?: string;
  onExit: () => void;
}

// ── Mô tả task trong hàng đợi ──────────────────────────────────────────────────

type PromptType = "hanzi" | "meaning" | "listen";
type Variant = "meaning" | "hanzi" | "pinyin" | "tone" | "listen";

interface BuiltMcq {
  question: string;
  prompt: { type: PromptType; word: VocabWordCard };
  options: string[];
  optionKind: OptionKind;
  correctIndex: number;
  audioWord?: VocabWordCard;
  autoPlay?: boolean;
}

type Task =
  | { kind: "match"; words: VocabWordCard[] }
  | { kind: "flashcard"; word: VocabWordCard; isNew: boolean; grade: boolean }
  | { kind: "mcq"; word: VocabWordCard; q: BuiltMcq; grade: boolean };

const SESSION_CAP = 24;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function feasibleVariants(word: VocabWordCard, poolSize: number): Variant[] {
  const v: Variant[] = [];
  if (poolSize >= 2) v.push("meaning", "hanzi", "pinyin", "listen");
  if (countChineseChars(word.hanzi) === 1) v.push("tone");
  return v;
}

function buildMcq(word: VocabWordCard, variant: Variant, pool: VocabWordCard[]): BuiltMcq | null {
  if (variant === "tone") {
    const tone = getTone(word.pinyin);
    return {
      question: "Từ này mang thanh điệu nào?",
      prompt: { type: "hanzi", word },
      options: ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4", "Thanh nhẹ"],
      optionKind: "text",
      correctIndex: tone === 0 ? 4 : tone - 1,
      audioWord: word,
    };
  }

  const valueOf = (w: VocabWordCard) =>
    variant === "hanzi" || variant === "listen" ? w.hanzi : variant === "pinyin" ? w.pinyin : w.meaning;
  const correctVal = valueOf(word);
  // Khử trùng đáp án theo GIÁ TRỊ HIỂN THỊ (không chỉ so với đáp án đúng): tránh
  // hai nút giống hệt nhau khi gặp đồng âm (pinyin) hoặc nghĩa trùng.
  const seenValues = new Set<string>([correctVal]);
  const distractors: VocabWordCard[] = [];
  for (const w of shuffle(pool.filter((x) => x.id !== word.id))) {
    const v = valueOf(w);
    if (seenValues.has(v)) continue;
    seenValues.add(v);
    distractors.push(w);
    if (distractors.length === 3) break;
  }
  const optionWords = shuffle([word, ...distractors]);
  if (optionWords.length < 2) return null;

  const optionKind: OptionKind =
    variant === "hanzi" || variant === "listen" ? "hanzi" : variant === "pinyin" ? "pinyin" : "text";
  const question =
    variant === "hanzi"
      ? "Chọn chữ Hán đúng"
      : variant === "pinyin"
        ? "Chọn pinyin đúng"
        : variant === "listen"
          ? "Nghe và chọn từ đúng"
          : "Từ này nghĩa là gì?";
  const prompt: { type: PromptType; word: VocabWordCard } =
    variant === "hanzi"
      ? { type: "meaning", word }
      : variant === "listen"
        ? { type: "listen", word }
        : { type: "hanzi", word };

  return {
    question,
    prompt,
    options: optionWords.map(valueOf),
    optionKind,
    correctIndex: optionWords.findIndex((w) => w.id === word.id),
    audioWord: variant === "listen" ? word : undefined,
    autoPlay: variant === "listen",
  };
}

function primaryTask(word: VocabWordCard, isNew: boolean, pool: VocabWordCard[]): Task {
  if (isNew) return { kind: "flashcard", word, isNew: true, grade: true };
  const variants = feasibleVariants(word, pool.length);
  if (variants.length) {
    const v = variants[Math.floor(Math.random() * variants.length)];
    const q = buildMcq(word, v, pool);
    if (q) return { kind: "mcq", word, q, grade: true };
  }
  return { kind: "flashcard", word, isNew: false, grade: true };
}

interface Session {
  queue: Task[];
  totalGraded: number;
  early: boolean;
}

function buildSession(words: VocabWordCard[], reviews: WordReviewState[], pool: VocabWordCard[]): Session {
  const now = new Date();
  const byId = new Map(reviews.map((r) => [r.wordId, r]));
  let due = words.filter((w) => isDue(byId.get(w.id)?.dueAt ?? null, now));
  const early = due.length === 0;
  if (early) due = [...words]; // không có từ đến hạn → cho ôn sớm toàn bộ
  const ordered = shuffle(due).slice(0, SESSION_CAP);

  const queue: Task[] = [];
  if (ordered.length >= 4) {
    queue.push({ kind: "match", words: ordered.slice(0, Math.min(6, ordered.length)) });
  }
  for (const w of ordered) {
    const rev = byId.get(w.id);
    const isNew = !rev || rev.repetitions === 0;
    queue.push(primaryTask(w, isNew, pool));
  }
  return { queue, totalGraded: ordered.length, early };
}

export function ReviewFlow({ words, reviews, pool, title = "Ôn từ", onExit }: Props) {
  const distractorPool = pool ?? words;
  const [session] = useState<Session>(() => buildSession(words, reviews, distractorPool));
  const [queue, setQueue] = useState<Task[]>(session.queue);
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(0);
  const [remembered, setRemembered] = useState(0);
  const [forgot, setForgot] = useState(0);

  const total = Math.max(1, session.totalGraded);
  const current = queue[index];
  // Thanh tiến trình theo hàng đợi (đã gồm cả thẻ học lại được thêm vào): chỉ đạt
  // 100% khi thực sự hết phiên, không "đầy sớm" như khi chia theo số từ.
  const progress = queue.length > 0 ? Math.round((index / queue.length) * 100) : 0;

  function advance() {
    setIndex((i) => i + 1);
  }
  function requeue(word: VocabWordCard) {
    setQueue((q) => [...q, { kind: "flashcard", word, isNew: false, grade: false }]);
  }
  function grade(word: VocabWordCard, quality: number) {
    const ok = quality >= 3;
    setRemembered((n) => n + (ok ? 1 : 0));
    setForgot((n) => n + (ok ? 0 : 1));
    setDone((n) => n + 1);
    void reviewWordAction({ wordId: word.id, quality }).catch(() => {});
  }

  function onFlashcardRate(task: Extract<Task, { kind: "flashcard" }>, rating: SrsRating) {
    if (task.grade) {
      const q = ratingToQuality(rating);
      if (rating === "again") requeue(task.word);
      grade(task.word, q);
    }
    advance();
  }
  function onMcqAnswered(task: Extract<Task, { kind: "mcq" }>, correct: boolean) {
    const q = correctnessToQuality(correct);
    if (!correct) requeue(task.word);
    grade(task.word, q);
    advance();
  }

  // Không có từ để ôn (bài rỗng) — bảo vệ.
  if (words.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BaoBuddy size={88} pose="idle" className="mx-auto" />
        <h2 className="text-xl font-bold">Chưa có từ để ôn</h2>
        <Button variant="outline" onClick={onExit}>
          Quay lại
        </Button>
      </div>
    );
  }

  // Kết thúc phiên.
  if (!current) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <BaoBuddy size={104} pose="cheer" message="加油!" className="mx-auto" />
            <h2 className="text-2xl font-bold">Hoàn thành phiên ôn!</h2>
            <p className="text-sm text-muted-foreground">
              Đã ôn {total} từ — lịch ôn kế tiếp đã được cập nhật theo trí nhớ của bạn.
            </p>
            <div className="flex justify-center gap-6 py-1 text-sm">
              <div>
                <div className="text-2xl font-bold text-green-600">{remembered}</div>
                <div className="text-muted-foreground">Nhớ tốt</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">{forgot}</div>
                <div className="text-muted-foreground">Cần ôn lại</div>
              </div>
            </div>
            <Button className="w-full" onClick={onExit}>
              Hoàn tất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={onExit}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Thoát"
        >
          <X className="h-5 w-5" />
        </button>
        <Progress value={progress} className="h-3 flex-1" />
        <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
          {Math.min(done + 1, total)}/{total}
        </span>
      </div>

      <div className="pb-1 text-center text-xs font-medium text-muted-foreground">
        {title}
        {session.early && " · ôn sớm"}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          className="flex flex-1 flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {current.kind === "match" && <MatchGame words={current.words} onDone={advance} />}

          {current.kind === "flashcard" && (
            <SrsFlashcard
              word={current.word}
              isNew={current.isNew}
              onRate={(rating) => onFlashcardRate(current, rating)}
            />
          )}

          {current.kind === "mcq" && (
            <McqCard
              question={current.q.question}
              promptNode={<PromptNode prompt={current.q.prompt} />}
              options={current.q.options}
              optionKind={current.q.optionKind}
              correctIndex={current.q.correctIndex}
              audioWord={current.q.audioWord}
              autoPlay={current.q.autoPlay}
              onAnswered={(correct) => onMcqAnswered(current, correct)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Vùng đề bài cho MCQ. Chữ Hán để màu trung tính để không lộ thanh điệu/pinyin. */
function PromptNode({ prompt }: { prompt: { type: PromptType; word: VocabWordCard } }) {
  if (prompt.type === "meaning") {
    return <div className="px-4 text-center text-3xl font-bold">{prompt.word.meaning}</div>;
  }
  if (prompt.type === "listen") {
    return <div className="text-6xl">🔊</div>;
  }
  return <div className="font-chinese text-6xl font-bold">{prompt.word.hanzi}</div>;
}
