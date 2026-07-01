/**
 * Sinh nội dung "BÀI MẪU" cho các phần (skill) còn trống của Lộ trình, SUY RA
 * TRỰC TIẾP từ TỪ VỰNG đã có của bài (hanzi/pinyin/nghĩa + câu ví dụ đã thẩm định).
 * Không gọi AI → không bịa: mọi câu hỏi/đáp án đúng theo cấu trúc, khớp 100% hợp
 * đồng chấm điểm của từng trình chơi (xem grammar-exercise-grading-contract).
 *
 * Mỗi phần được đánh dấu `content.sample = true` (ẩn với học viên, còn trong DB để
 * loader nhận diện & làm mới) và gắn nhãn "(Bài mẫu)" ở các trường tiêu đề hiển thị.
 *
 * Dùng bởi prisma/load-roadmap-samples.ts. Chỉ phụ thuộc pinyin-pro (không import prisma).
 */
import { pinyin } from "pinyin-pro";

export interface Example {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
export interface Word {
  hanzi: string;
  pinyin: string;
  meaning: string;
  examples: Example[];
}
export type DerivableSkill =
  | "HANZI"
  | "GRAMMAR"
  | "READING"
  | "LISTENING"
  | "WRITING"
  | "SPEAKING";

export interface DerivedSection {
  skill: DerivableSkill;
  order: number;
  content: Record<string, unknown>;
}

export const SKILL_ORDER: Record<DerivableSkill, number> = {
  GRAMMAR: 2,
  HANZI: 3,
  READING: 4,
  LISTENING: 5,
  WRITING: 6,
  SPEAKING: 7,
};

// ───────────────────────── helpers ─────────────────────────

const PUNCT = /[。，、．！？；：“”‘’（）【】「」《》〈〉()[\]{}.,!?;:"'`~·…—\-\s]/g;
export const stripPunct = (s: string) => s.normalize("NFC").replace(PUNCT, "");

/** Có tồn tại một thứ tự các thẻ `words` ghép lại đúng `target` (không dấu)? (quay lui) */
export function tileable(words: string[], target: string): boolean {
  const tiles = words.map(stripPunct);
  if (tiles.some((t) => !t)) return false;
  const bt = (rem: string, used: number): boolean => {
    if (rem === "") return used === (1 << tiles.length) - 1;
    for (let i = 0; i < tiles.length; i++) {
      if (used & (1 << i)) continue;
      if (rem.startsWith(tiles[i]) && bt(rem.slice(tiles[i].length), used | (1 << i))) return true;
    }
    return false;
  };
  return bt(target, 0);
}

export function toPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", separator: " " });
}

/** Băm chuỗi → seed ổn định theo BÀI (để vị trí đáp án khác nhau giữa các bài). */
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/** Thanh điệu (0 nhẹ, 1–4) của một chữ Hán đơn. */
export function toneOf(char: string): number {
  const p = (pinyin(char, { toneType: "num", type: "array" })[0] as string) ?? "";
  const m = p.match(/([0-5])/);
  if (!m) return 0;
  const n = Number(m[1]);
  return n === 5 ? 0 : n;
}

/** Cắt câu tiếng Trung thành các "thẻ từ" (bỏ dấu câu). Fallback: tách từng chữ. */
export function segTiles(sentence: string): string[] {
  const bare = stripPunct(sentence);
  if (!bare) return [];
  try {
    const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
    if (Seg) {
      const seg = new Seg("zh", { granularity: "word" });
      const tiles = [...seg.segment(bare)]
        .map((s) => stripPunct(s.segment))
        .filter(Boolean);
      if (tiles.length >= 2 && tiles.join("") === bare) return tiles;
    }
  } catch {
    /* fall through */
  }
  return [...bare]; // từng chữ
}

/**
 * Xáo trộn xác định (theo seed) — dùng BIT CAO của bộ sinh LCG (bit thấp của LCG
 * kém ngẫu nhiên → nếu dùng `% n` đáp án đúng hay rơi vào một vị trí cố định).
 * Tái lập được (cùng seed → cùng kết quả) để chạy loader lại không đổi nội dung.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  // splitmix32: trộn tốt ngay từ lần rút đầu (LCG cơ bản có bit thấp/kết quả đầu
  // tương quan giữa các seed gần nhau → lệch vị trí đáp án).
  let s = (seed ^ 0x9e3779b9) >>> 0;
  const next = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    z = (z ^ (z >>> 15)) >>> 0;
    return z / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  // đảm bảo khác thứ tự gốc nếu có thể (đẹp cho câu sắp-xếp)
  if (a.length > 1 && a.every((x, i) => x === arr[i])) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
}

/** Lấy n phần tử phân biệt từ pool, bỏ các giá trị trong `exclude`, bắt đầu tại offset. */
function pickDistinct(pool: string[], exclude: Set<string>, n: number, offset: number): string[] {
  const out: string[] = [];
  const seen = new Set(exclude);
  const L = pool.length;
  for (let k = 0; k < L && out.length < n; k++) {
    const v = pool[(offset + k) % L];
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

// Câu ví dụ dùng cho đoạn Đọc/Nghe/Nói có thể DÀI (HSK5/6 câu 13–17 thẻ vẫn ổn);
// còn câu sắp-xếp (reorder/sentence_order) phải NGẮN để chơi được → dùng REORDER_MAX.
const PASSAGE_MAX_TILES = 24;
const REORDER_MAX_TILES = 12;

/** Ví dụ hợp lệ (chứa từ khoá, ghép lại đúng, số thẻ ≤ maxTiles). */
function goodExample(w: Word, maxTiles = PASSAGE_MAX_TILES): { ex: Example; tiles: string[] } | null {
  for (const ex of w.examples ?? []) {
    const hz = (ex.hanzi ?? "").trim();
    if (!hz || !ex.meaning?.trim()) continue;
    const tiles = segTiles(hz);
    if (tiles.length < 2 || tiles.length > maxTiles) continue;
    if (stripPunct(hz) !== tiles.join("")) continue;
    return { ex: { hanzi: hz, pinyin: ex.pinyin?.trim() || toPinyin(hz), meaning: ex.meaning.trim() }, tiles };
  }
  return null;
}

const SAMPLE_NOTE =
  "⚠️ Nội dung MẪU (tạo tự động từ từ vựng của bài) để trải nghiệm đủ kỹ năng. " +
  "Giáo viên sẽ thay bằng bài giảng chính thức.";

// ───────────────────────── MCQ/TF builders (Đọc & Nghe) ─────────────────────────

interface Q {
  type: "MCQ" | "TRUE_FALSE";
  prompt: string;
  options?: { text: string }[];
  correctAnswer: { index?: number; value?: boolean };
  explanation: string;
}

/** MCQ hỏi nghĩa của một từ có trong ngữ cảnh. Đáp án đúng theo cấu trúc. */
function meaningMCQ(w: Word, meaningPool: string[], seed: number): Q {
  const distractors = pickDistinct(meaningPool, new Set([w.meaning]), 3, seed + 1);
  const opts = [w.meaning, ...distractors];
  if (opts.length < 2) throw new Error(`meaningMCQ: thiếu lựa chọn cho ${w.hanzi}`);
  const shuffled = seededShuffle(opts, seed);
  const index = shuffled.indexOf(w.meaning);
  if (index < 0) throw new Error(`meaningMCQ: mất đáp án đúng ${w.hanzi}`);
  return {
    type: "MCQ",
    prompt: `「${w.hanzi}」在文中是什么意思？`,
    options: shuffled.map((t) => ({ text: t })),
    correctAnswer: { index },
    explanation: `「${w.hanzi}」(${w.pinyin}) nghĩa là "${w.meaning}".`,
  };
}

/** TRUE_FALSE: đoạn có/không nhắc tới từ X (đúng theo cấu trúc). */
function mentionTF(hanzi: string, present: boolean): Q {
  return {
    type: "TRUE_FALSE",
    prompt: `文中提到了「${hanzi}」。`,
    correctAnswer: { value: present },
    explanation: present
      ? `Đúng —「${hanzi}」xuất hiện trong đoạn.`
      : `Sai — 「${hanzi}」không xuất hiện trong đoạn.`,
  };
}

/** Bộ câu hỏi Đọc/Nghe cho một đoạn văn dựng từ ví dụ của `used` (các từ có trong đoạn). */
function comprehensionQuestions(
  used: Word[],
  passage: string,
  pool: Word[],
  meaningPool: string[],
  seed: number
): Q[] {
  const qs: Q[] = [];
  const inPassage = used.filter((w) => passage.includes(w.hanzi));
  const mcqWords = inPassage.slice(0, 2);
  mcqWords.forEach((w, i) => qs.push(meaningMCQ(w, meaningPool, seed + i * 7)));
  if (inPassage[0]) qs.push(mentionTF(inPassage[0].hanzi, true));
  const outside = pool.find((w) => !passage.includes(w.hanzi) && !used.some((u) => u.hanzi === w.hanzi));
  if (outside) qs.push(mentionTF(outside.hanzi, false));
  // đảm bảo tối thiểu 2 câu
  if (qs.length < 2 && inPassage[0]) qs.push(mentionTF(inPassage[0].hanzi, true));
  return qs;
}

// ───────────────────────── derive per skill ─────────────────────────

function deriveHanzi(words: Word[], meta: Meta): Record<string, unknown> | null {
  const seen = new Set<string>();
  const chars: Record<string, unknown>[] = [];
  // Ưu tiên từ đơn âm (nghĩa chính xác), sau đó chữ đầu của từ ghép.
  for (const w of words) {
    const cs = [...w.hanzi.normalize("NFC")];
    if (cs.length === 1 && !seen.has(w.hanzi)) {
      seen.add(w.hanzi);
      chars.push({
        character: w.hanzi,
        pinyin: w.pinyin || toPinyin(w.hanzi),
        tone: toneOf(w.hanzi),
        meaning: w.meaning,
        strokeCount: 0,
        examples: (w.examples ?? []).slice(0, 2),
      });
    }
    if (chars.length >= 8) break;
  }
  if (chars.length < 8) {
    for (const w of words) {
      const first = [...w.hanzi.normalize("NFC")][0];
      if (!first || seen.has(first)) continue;
      seen.add(first);
      chars.push({
        character: first,
        pinyin: pinyin(first, { toneType: "symbol" }),
        tone: toneOf(first),
        meaning: `chữ trong「${w.hanzi}」— ${w.meaning}`,
        strokeCount: 0,
        examples: (w.examples ?? []).slice(0, 1),
      });
      if (chars.length >= 8) break;
    }
  }
  if (chars.length === 0) return null;
  return { characters: chars, sample: true };
}

function deriveGrammar(words: Word[], pool: Word[], meta: Meta, base: number): Record<string, unknown> | null {
  const withEx = words.map((w) => ({ w, g: goodExample(w) })).filter((x) => x.g) as {
    w: Word;
    g: { ex: Example; tiles: string[] };
  }[];
  const hanziPool = [...new Set(pool.map((w) => w.hanzi))];
  const exercises: Record<string, unknown>[] = [];

  // 2× translate (VI → 中文, cấp độ từ): opt === answer, answer ∈ options.
  words.slice(0, 2).forEach((w, i) => {
    const options = [w.hanzi, ...pickDistinct(hanziPool, new Set([w.hanzi]), 3, base + i * 5 + 3)];
    if (options.length < 2) return;
    exercises.push({
      type: "translate",
      direction: "vi_to_zh",
      prompt: w.meaning,
      answer: w.hanzi,
      options: seededShuffle(options, base + i * 5 + 1),
      explanation: `"${w.meaning}" = 「${w.hanzi}」(${w.pinyin}).`,
    });
  });

  // 2× fill_blank: khoét 1 từ trong chính câu ví dụ của nó.
  withEx.slice(0, 2).forEach(({ w, g }, i) => {
    if (!g.ex.hanzi.includes(w.hanzi)) return;
    const sentence = g.ex.hanzi.replace(w.hanzi, "___");
    if (!sentence.includes("___")) return;
    const options = [w.hanzi, ...pickDistinct(hanziPool, new Set([w.hanzi]), 3, base + i * 6 + 9)];
    if (options.length < 2) return;
    exercises.push({
      type: "fill_blank",
      sentence,
      blank: w.hanzi,
      options: seededShuffle(options, base + i * 6 + 2),
      hint: w.meaning,
      explanation: `Chỗ trống điền 「${w.hanzi}」— ${g.ex.meaning}`,
    });
  });

  // 2× sentence_order: chosen.join("") === answer (không dấu). Chỉ dùng câu NGẮN.
  withEx
    .filter(({ g }) => g.tiles.length <= REORDER_MAX_TILES)
    .slice(0, 3)
    .forEach(({ g }, i) => {
    const answer = stripPunct(g.ex.hanzi);
    const tiles = g.tiles;
    if (tiles.length < 2 || tiles.join("") !== answer) return;
    if (exercises.filter((e) => e.type === "sentence_order").length >= 2) return;
    exercises.push({
      type: "sentence_order",
      words: seededShuffle(tiles, base + i * 4 + 5),
      answer,
      meaning: g.ex.meaning,
      explanation: `Trật tự đúng: ${g.ex.hanzi} (${g.ex.pinyin}).`,
    });
  });

  if (exercises.length === 0) return null;

  const examples = withEx.slice(0, 4).map(({ g }) => ({
    hanzi: g.ex.hanzi,
    pinyin: g.ex.pinyin,
    meaning: g.ex.meaning,
  }));

  const section = {
    id: "s1",
    title: `(Bài mẫu) Mẫu câu — ${meta.topic}`,
    titleZh: meta.topicZh,
    explanation: `${SAMPLE_NOTE}\n\nDưới đây là các mẫu câu tiêu biểu của chủ đề «${meta.topic}» — quan sát cách dùng từ trong câu rồi làm bài tập.`,
    examples: examples.length ? examples : [{ hanzi: words[0].hanzi, pinyin: words[0].pinyin, meaning: words[0].meaning }],
    exercises,
  };
  return { version: 3, sections: [section], test: { questions: [], passThreshold: 60 }, sample: true };
}

function buildPassageContent(words: Word[], pool: Word[], meta: Meta, seed: number) {
  const withEx = words.map((w) => ({ w, g: goodExample(w) })).filter((x) => x.g) as {
    w: Word;
    g: { ex: Example; tiles: string[] };
  }[];
  const used = withEx.slice(0, 6);
  if (used.length < 2) return null;
  const passage = used.map((u) => u.g.ex.hanzi).join("");
  const meaningPool = [...new Set(pool.map((w) => w.meaning))];
  const questions = comprehensionQuestions(
    used.map((u) => u.w),
    passage,
    pool,
    meaningPool,
    seed
  );
  if (questions.length < 2) return null;
  const transcriptExplanation = used.map((u) => u.g.ex.meaning).join(" ");
  return { passage, questions, transcriptExplanation };
}

function deriveReading(words: Word[], pool: Word[], meta: Meta, base: number): Record<string, unknown> | null {
  const built = buildPassageContent(words, pool, meta, base + 101);
  if (!built) return null;
  return {
    title: `(Bài mẫu) Đọc hiểu — ${meta.topic}`,
    titleZh: meta.topicZh,
    timeLimit: 600,
    passages: [
      {
        passage: built.passage,
        passagePinyin: toPinyin(built.passage),
        titleZh: meta.topicZh,
        questions: built.questions,
      },
    ],
    sample: true,
  };
}

function deriveListening(words: Word[], pool: Word[], meta: Meta, base: number): Record<string, unknown> | null {
  const built = buildPassageContent(words, pool, meta, base + 202);
  if (!built) return null;
  return {
    title: `(Bài mẫu) Nghe hiểu — ${meta.topic}`,
    timeLimit: 180,
    clips: [
      {
        title: "Đoạn 1",
        audioUrl: "", // trình duyệt đọc bằng giọng zh-CN (Web Speech)
        transcript: built.passage,
        transcriptExplanation: built.transcriptExplanation,
        questions: built.questions,
      },
    ],
    sample: true,
  };
}

function deriveWriting(words: Word[], meta: Meta, base: number): Record<string, unknown> | null {
  const all = words.map((w) => goodExample(w)).filter(Boolean) as {
    ex: Example;
    tiles: string[];
  }[];
  // Ưu tiên câu NGẮN (dễ sắp xếp hơn); nếu chỉ có câu dài (HSK6) thì vẫn dùng.
  const short = all.filter((g) => g.tiles.length <= REORDER_MAX_TILES);
  const withEx = (short.length ? short : all).slice().sort((a, b) => a.tiles.length - b.tiles.length);
  const sentences = withEx.slice(0, 4).map((g, i) => ({
    words: seededShuffle(g.tiles, base + i * 3 + 7),
    answer: g.ex.hanzi,
    translation: g.ex.meaning,
    pinyin: g.ex.pinyin,
  }));
  if (sentences.length === 0) return null;
  return { mode: "reorder", title: `(Bài mẫu) Luyện viết — ${meta.topicZh}`, sentences, sample: true };
}

function deriveSpeaking(words: Word[], meta: Meta): Record<string, unknown> | null {
  const withEx = words.map((w) => goodExample(w)).filter(Boolean) as {
    ex: Example;
    tiles: string[];
  }[];
  if (withEx.length < 1) return null;
  const part1 = withEx.slice(0, 3).map((g) => ({ text: g.ex.hanzi, pinyin: g.ex.pinyin }));
  const passageText = withEx.slice(0, 3).map((g) => g.ex.hanzi).join("");
  const w1 = words[0];
  const part3 = [
    { question: `请用「${w1.hanzi}」说一句话。`, pinyin: toPinyin(`请用${w1.hanzi}说一句话。`) },
    { question: `请简单谈谈「${meta.topicZh}」。`, pinyin: toPinyin(`请简单谈谈${meta.topicZh}。`) },
  ];
  return {
    part1Sentences: part1,
    part2Passage: { text: passageText, pinyin: toPinyin(passageText) },
    part3Questions: part3,
    sample: true,
  };
}

export interface Meta {
  topic: string;
  topicZh: string;
}

/**
 * Suy ra content BÀI MẪU cho các skill yêu cầu. Trả về mảng section dựng được
 * (skill nào thiếu dữ liệu sẽ bị bỏ qua — loader sẽ cảnh báo).
 */
export function deriveSections(
  words: Word[],
  pool: Word[],
  meta: Meta,
  skills: Set<DerivableSkill>
): DerivedSection[] {
  const out: DerivedSection[] = [];
  const base = hashStr(`${meta.topicZh}|${meta.topic}`);
  const add = (skill: DerivableSkill, content: Record<string, unknown> | null) => {
    if (content) out.push({ skill, order: SKILL_ORDER[skill], content });
  };
  if (skills.has("HANZI")) add("HANZI", deriveHanzi(words, meta));
  if (skills.has("GRAMMAR")) add("GRAMMAR", deriveGrammar(words, pool, meta, base));
  if (skills.has("READING")) add("READING", deriveReading(words, pool, meta, base));
  if (skills.has("LISTENING")) add("LISTENING", deriveListening(words, pool, meta, base));
  if (skills.has("WRITING")) add("WRITING", deriveWriting(words, meta, base));
  if (skills.has("SPEAKING")) add("SPEAKING", deriveSpeaking(words, meta));
  return out;
}

// ───────────────────────── self-check (khớp hợp đồng chấm điểm) ─────────────────────────

/** Kiểm tra một section suy ra có GIẢI ĐƯỢC không (đúng cách UI chấm). Ném lỗi nếu sai. */
export function assertSolvable(section: DerivedSection): void {
  const { skill, content } = section;
  const where = `[${skill}]`;
  if (skill === "GRAMMAR") {
    const secs = (content.sections as Record<string, unknown>[]) ?? [];
    for (const s of secs) {
      for (const ex of (s.exercises as Record<string, unknown>[]) ?? []) {
        if (ex.type === "fill_blank") {
          const sentence = String(ex.sentence ?? "");
          const blank = String(ex.blank ?? "");
          const options = (ex.options as string[]) ?? [];
          if (!sentence.includes("___")) throw new Error(`${where} fill_blank thiếu "___"`);
          if (!options.includes(blank) || options.length < 2)
            throw new Error(`${where} fill_blank blank∉options`);
        } else if (ex.type === "sentence_order") {
          const words = (ex.words as string[]) ?? [];
          const answer = stripPunct(String(ex.answer ?? ""));
          if (words.length < 2) throw new Error(`${where} sentence_order <2 thẻ`);
          if (!tileable(words, answer))
            throw new Error(`${where} sentence_order thẻ không ghép thành answer`);
        } else if (ex.type === "translate") {
          const answer = String(ex.answer ?? "");
          const options = (ex.options as string[]) ?? [];
          if (!options.includes(answer) || options.length < 2)
            throw new Error(`${where} translate answer∉options`);
        } else {
          throw new Error(`${where} loại bài tập lạ ${ex.type}`);
        }
      }
    }
  }
  if (skill === "READING" || skill === "LISTENING") {
    const groups = skill === "READING" ? (content.passages as any[]) : (content.clips as any[]);
    for (const grp of groups ?? []) {
      const passage: string = skill === "READING" ? grp.passage : grp.transcript;
      for (const q of grp.questions ?? []) {
        if (q.type === "MCQ") {
          const idx = q.correctAnswer?.index;
          if (typeof idx !== "number" || idx < 0 || idx >= (q.options?.length ?? 0))
            throw new Error(`${where} MCQ index sai`);
        } else if (q.type === "TRUE_FALSE") {
          if (typeof q.correctAnswer?.value !== "boolean")
            throw new Error(`${where} TF thiếu value`);
          // câu "đúng" phải thực sự có trong đoạn; câu "sai" phải thực sự không có
          const m = String(q.prompt).match(/「(.+?)」/);
          if (m && passage) {
            const inTxt = passage.includes(m[1]);
            if (inTxt !== q.correctAnswer.value)
              throw new Error(`${where} TF "${m[1]}" present=${inTxt}≠value=${q.correctAnswer.value}`);
          }
        } else {
          throw new Error(`${where} loại câu hỏi lạ ${q.type}`);
        }
      }
    }
  }
  if (skill === "WRITING") {
    for (const s of (content.sentences as any[]) ?? []) {
      if ((s.words?.length ?? 0) < 2) throw new Error(`${where} reorder <2 thẻ`);
      if (!tileable(s.words as string[], stripPunct(String(s.answer))))
        throw new Error(`${where} reorder thẻ không ghép thành answer`);
    }
  }
}
