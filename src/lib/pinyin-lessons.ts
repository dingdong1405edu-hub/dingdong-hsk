// Bài học PHIÊN ÂM kiểu flashcard (Duolingo-style). Mỗi bài là một chuỗi thẻ:
//  - "teach": giới thiệu một âm (xem + nghe), không tính điểm.
//  - "listen": nghe chữ Hán rồi chọn phiên âm đúng (tính điểm).
//  - "discriminate": nghe một trong hai âm dễ lẫn rồi chọn đúng âm vừa nghe.
//  - "tone": nghe rồi chọn thanh điệu đúng.
//
// Học viên có thể học LẦN LƯỢT theo thứ tự, hoặc nhảy thẳng vào nhóm mình thích từ
// bảng tra cứu (mỗi nhóm trỏ về một bài ở đây).

import { INITIALS, FINALS, TONES, type Sound, type ToneInfo } from "./pinyin-data";
import { CONFUSIONS, getConfusion, type ConfusionPair } from "./pinyin-confusions";

export interface TeachCard {
  kind: "teach";
  category: string; // "Thanh mẫu" | "Vận mẫu" | "Thanh điệu"
  big: string; // âm hiển thị lớn
  toneColor: number; // số thanh của ví dụ — để tô màu
  hanzi: string;
  pinyin: string;
  gloss: string;
  hint: string;
}

export interface ListenCard {
  kind: "listen";
  prompt: string;
  hanzi: string; // phát âm chữ này
  answer: string; // pinyin đúng
  gloss: string;
  options: string[]; // gồm cả answer (client tự xáo trộn)
}

export interface DiscriminateCard {
  kind: "discriminate";
  prompt: string;
  a: { hanzi: string; pinyin: string; gloss: string };
  b: { hanzi: string; pinyin: string; gloss: string };
  note: string;
}

export interface ToneCard {
  kind: "tone";
  prompt: string;
  hanzi: string;
  pinyin: string;
  tone: number; // đáp án 0-4
}

export type PinyinCard = TeachCard | ListenCard | DiscriminateCard | ToneCard;

export interface PinyinLesson {
  id: string;
  title: string;
  subtitle: string;
  kind: "tones" | "initials" | "finals" | "review";
  cards: PinyinCard[];
}

// ── Builders ─────────────────────────────────────────────────────────────────

const initialMap = new Map(INITIALS.map((s) => [s.sound, s]));
const finalMap = new Map(FINALS.map((s) => [s.sound, s]));

function I(s: string): Sound {
  const v = initialMap.get(s);
  if (!v) throw new Error(`Thanh mẫu không tồn tại: ${s}`);
  return v;
}
function F(s: string): Sound {
  const v = finalMap.get(s);
  if (!v) throw new Error(`Vận mẫu không tồn tại: ${s}`);
  return v;
}

function teach(s: Sound, category: string): TeachCard {
  return { kind: "teach", category, big: s.sound, toneColor: s.tone, hanzi: s.hanzi, pinyin: s.pinyin, gloss: s.gloss, hint: s.hint };
}
function teachTone(t: ToneInfo): TeachCard {
  return { kind: "teach", category: "Thanh điệu", big: t.mark, toneColor: t.tone, hanzi: t.hanzi, pinyin: t.pinyin, gloss: t.gloss, hint: t.desc };
}
const teachInitials = (...keys: string[]) => keys.map((k) => teach(I(k), "Thanh mẫu"));
const teachFinals = (...keys: string[]) => keys.map((k) => teach(F(k), "Vận mẫu"));

function listen(s: Sound, distractors: string[], prompt = "Nghe và chọn phiên âm đúng"): ListenCard {
  return { kind: "listen", prompt, hanzi: s.hanzi, answer: s.pinyin, gloss: s.gloss, options: [s.pinyin, ...distractors] };
}
function discrim(p: ConfusionPair, prompt = "Bạn vừa nghe thấy âm nào?"): DiscriminateCard {
  return {
    kind: "discriminate", prompt,
    a: { hanzi: p.a.hanzi, pinyin: p.a.pinyin, gloss: p.a.gloss },
    b: { hanzi: p.b.hanzi, pinyin: p.b.pinyin, gloss: p.b.gloss },
    note: p.note,
  };
}
const C = (id: string) => discrim(getConfusion(id)!);
function toneCard(hanzi: string, pinyin: string, tone: number): ToneCard {
  return { kind: "tone", prompt: "Nghe và chọn thanh điệu đúng", hanzi, pinyin, tone };
}

// ── Bài học ──────────────────────────────────────────────────────────────────

export const PINYIN_LESSONS: PinyinLesson[] = [
  {
    id: "pinyin-tones",
    title: "Thanh điệu",
    subtitle: "4 thanh + thanh nhẹ — nền tảng của tiếng Trung",
    kind: "tones",
    cards: [
      ...TONES.map(teachTone),
      toneCard("妈", "mā", 1),
      toneCard("麻", "má", 2),
      toneCard("马", "mǎ", 3),
      toneCard("骂", "mà", 4),
      toneCard("高", "gāo", 1),
      toneCard("好", "hǎo", 3),
      toneCard("看", "kàn", 4),
      toneCard("鱼", "yú", 2),
    ],
  },
  {
    id: "pinyin-initials-1",
    title: "Thanh mẫu: môi & đầu lưỡi",
    subtitle: "b p m f · d t n l",
    kind: "initials",
    cards: [
      ...teachInitials("b", "p", "m", "f", "d", "t", "n", "l"),
      listen(I("m"), ["bā", "fā", "pā"]),
      listen(I("t"), ["dā", "nā", "lā"]),
      listen(I("f"), ["bēi", "pēi", "mēi"]),
      C("b-p"),
      C("d-t"),
      C("n-l"),
    ],
  },
  {
    id: "pinyin-initials-2",
    title: "Thanh mẫu: cuống lưỡi & mặt lưỡi",
    subtitle: "g k h · j q x",
    kind: "initials",
    cards: [
      ...teachInitials("g", "k", "h", "j", "q", "x"),
      listen(I("h"), ["gǎo", "kǎo", "hāo"]),
      listen(I("j"), ["qī", "xī", "zhī"]),
      listen(I("x"), ["jī", "qī", "shī"]),
      C("g-k"),
      C("j-q"),
    ],
  },
  {
    id: "pinyin-initials-3",
    title: "Thanh mẫu: uốn lưỡi & phẳng lưỡi",
    subtitle: "zh ch sh r · z c s (khó nhất với người Việt)",
    kind: "initials",
    cards: [
      ...teachInitials("zh", "ch", "sh", "r", "z", "c", "s"),
      listen(I("sh"), ["sū", "zhū", "chū"]),
      listen(I("s"), ["shān", "cān", "zān"]),
      listen(I("r"), ["lè", "zhè", "chè"]),
      C("sh-s"),
      C("zh-z"),
      C("ch-c"),
      C("zh-ch"),
    ],
  },
  {
    id: "pinyin-finals-1",
    title: "Vận mẫu: nguyên âm đơn & kép",
    subtitle: "a o e i u ü · ai ei ao ou",
    kind: "finals",
    cards: [
      ...teachFinals("a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou"),
      listen(F("e"), ["hā", "hāi", "hōu"]),
      listen(F("ou"), ["gǎo", "gāi", "gěi"]),
      C("i-v"),
    ],
  },
  {
    id: "pinyin-finals-2",
    title: "Vận mẫu ghép",
    subtitle: "ia ie iao iu · ua uo uai ui · üe",
    kind: "finals",
    cards: [
      ...teachFinals("ia", "ie", "iao", "iu", "ua", "uo", "uai", "ui", "üe"),
      listen(F("uo"), ["wā", "wǔ", "wāi"]),
      listen(F("ie"), ["xià", "xiǎo", "xiū"]),
    ],
  },
  {
    id: "pinyin-finals-3",
    title: "Vận mẫu mũi: -n và -ng",
    subtitle: "an en in … / ang eng ing ong (phân biệt đuôi mũi)",
    kind: "finals",
    cards: [
      ...teachFinals("an", "en", "in", "un", "ün", "ang", "eng", "ing", "ong"),
      listen(F("ang"), ["mán", "máo", "mǎi"]),
      listen(F("ing"), ["tíng", "tī", "tiān"]),
      C("an-ang"),
      C("en-eng"),
      C("in-ing"),
    ],
  },
  {
    id: "pinyin-review",
    title: "Ôn tập: phân biệt âm dễ lẫn",
    subtitle: "Tổng hợp tất cả cặp dễ nhầm + thanh điệu",
    kind: "review",
    cards: [
      ...CONFUSIONS.map((p) => discrim(p)),
      toneCard("买", "mǎi", 3),
      toneCard("卖", "mài", 4),
      toneCard("书", "shū", 1),
      listen(I("zh"), ["zōng", "cōng", "sōng"]),
      listen(F("ang"), ["fán", "fèn", "fēng"]),
    ],
  },
];

export function getPinyinLesson(id: string): PinyinLesson | undefined {
  return PINYIN_LESSONS.find((l) => l.id === id);
}

/** Số thẻ tính điểm (không kể thẻ "teach"). */
export function quizCount(lesson: PinyinLesson): number {
  return lesson.cards.filter((c) => c.kind !== "teach").length;
}

export interface PinyinLessonSummary {
  id: string;
  title: string;
  subtitle: string;
  kind: PinyinLesson["kind"];
  total: number; // tổng số thẻ
  quizzes: number; // số thẻ tính điểm
}

export const PINYIN_LESSON_SUMMARIES: PinyinLessonSummary[] = PINYIN_LESSONS.map((l) => ({
  id: l.id,
  title: l.title,
  subtitle: l.subtitle,
  kind: l.kind,
  total: l.cards.length,
  quizzes: quizCount(l),
}));
