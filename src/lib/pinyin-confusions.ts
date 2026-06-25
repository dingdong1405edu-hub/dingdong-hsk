// Các cặp phiên âm DỄ LẪN với người Việt. Mỗi cặp dùng một cặp tối thiểu (minimal
// pair): hai chữ Hán chỉ khác nhau ở đúng một âm (cùng vần, cùng thanh điệu) để khi
// nghe học viên phân biệt được điểm khác biệt duy nhất.

export interface ConfusionItem {
  sound: string; // âm đang xét, vd "b"
  hanzi: string;
  pinyin: string;
  tone: number;
  gloss: string;
}

export interface ConfusionPair {
  id: string;
  title: string; // vd "b / p"
  group: string; // aspiration | retroflex | liquid | vowel | nasal
  a: ConfusionItem;
  b: ConfusionItem;
  note: string; // điểm khác biệt + mẹo
}

export const CONFUSION_GROUPS: Record<string, string> = {
  aspiration: "Bật hơi ↔ không bật hơi",
  retroflex: "Uốn lưỡi ↔ phẳng lưỡi",
  liquid: "n · l · r",
  vowel: "Nguyên âm dễ lẫn",
  nasal: "Đuôi -n ↔ -ng",
};

export const CONFUSIONS: ConfusionPair[] = [
  // Bật hơi ↔ không bật hơi
  {
    id: "b-p", title: "b / p", group: "aspiration",
    a: { sound: "b", hanzi: "爸", pinyin: "bà", tone: 4, gloss: "bố" },
    b: { sound: "p", hanzi: "怕", pinyin: "pà", tone: 4, gloss: "sợ" },
    note: "b KHÔNG bật hơi, p BẬT HƠI mạnh. Mẹo: để mảnh giấy trước miệng — đọc p giấy rung, đọc b thì không.",
  },
  {
    id: "d-t", title: "d / t", group: "aspiration",
    a: { sound: "d", hanzi: "都", pinyin: "dōu", tone: 1, gloss: "đều" },
    b: { sound: "t", hanzi: "偷", pinyin: "tōu", tone: 1, gloss: "trộm" },
    note: "d không bật hơi (như 't' Việt), t bật hơi mạnh (như 'th' Việt).",
  },
  {
    id: "g-k", title: "g / k", group: "aspiration",
    a: { sound: "g", hanzi: "哥", pinyin: "gē", tone: 1, gloss: "anh trai" },
    b: { sound: "k", hanzi: "科", pinyin: "kē", tone: 1, gloss: "khoa, ngành" },
    note: "g không bật hơi (như 'c/k' Việt), k bật hơi mạnh (như 'kh' Việt).",
  },
  {
    id: "j-q", title: "j / q", group: "aspiration",
    a: { sound: "j", hanzi: "鸡", pinyin: "jī", tone: 1, gloss: "gà" },
    b: { sound: "q", hanzi: "七", pinyin: "qī", tone: 1, gloss: "bảy" },
    note: "Cùng mặt lưỡi: j không bật hơi, q bật hơi mạnh.",
  },
  {
    id: "z-c", title: "z / c", group: "aspiration",
    a: { sound: "z", hanzi: "早", pinyin: "zǎo", tone: 3, gloss: "sớm" },
    b: { sound: "c", hanzi: "草", pinyin: "cǎo", tone: 3, gloss: "cỏ" },
    note: "Cùng phẳng lưỡi: z không bật hơi, c bật hơi mạnh.",
  },
  {
    id: "zh-ch", title: "zh / ch", group: "aspiration",
    a: { sound: "zh", hanzi: "找", pinyin: "zhǎo", tone: 3, gloss: "tìm" },
    b: { sound: "ch", hanzi: "吵", pinyin: "chǎo", tone: 3, gloss: "ồn ào, cãi" },
    note: "Cùng uốn lưỡi: zh không bật hơi, ch bật hơi mạnh.",
  },
  // Uốn lưỡi ↔ phẳng lưỡi (lỗi rất phổ biến của người Việt)
  {
    id: "sh-s", title: "sh / s", group: "retroflex",
    a: { sound: "sh", hanzi: "是", pinyin: "shì", tone: 4, gloss: "là, phải" },
    b: { sound: "s", hanzi: "四", pinyin: "sì", tone: 4, gloss: "bốn" },
    note: "sh UỐN LƯỠI (lưỡi cong lên), s PHẲNG LƯỠI (đầu lưỡi sau răng). Đừng đọc cả hai thành 's'.",
  },
  {
    id: "zh-z", title: "zh / z", group: "retroflex",
    a: { sound: "zh", hanzi: "找", pinyin: "zhǎo", tone: 3, gloss: "tìm" },
    b: { sound: "z", hanzi: "早", pinyin: "zǎo", tone: 3, gloss: "sớm" },
    note: "zh UỐN LƯỠI, z PHẲNG LƯỠI — đều không bật hơi, chỉ khác vị trí lưỡi.",
  },
  {
    id: "ch-c", title: "ch / c", group: "retroflex",
    a: { sound: "ch", hanzi: "叉", pinyin: "chā", tone: 1, gloss: "cái nĩa; chéo" },
    b: { sound: "c", hanzi: "擦", pinyin: "cā", tone: 1, gloss: "lau, chùi" },
    note: "ch UỐN LƯỠI, c PHẲNG LƯỠI — đều bật hơi, chỉ khác vị trí lưỡi.",
  },
  // n / l / r
  {
    id: "n-l", title: "n / l", group: "liquid",
    a: { sound: "n", hanzi: "你", pinyin: "nǐ", tone: 3, gloss: "bạn" },
    b: { sound: "l", hanzi: "里", pinyin: "lǐ", tone: 3, gloss: "bên trong; dặm" },
    note: "n: hơi thoát qua MŨI. l: hơi thoát hai BÊN lưỡi.",
  },
  {
    id: "r-l", title: "r / l", group: "liquid",
    a: { sound: "r", hanzi: "热", pinyin: "rè", tone: 4, gloss: "nóng" },
    b: { sound: "l", hanzi: "乐", pinyin: "lè", tone: 4, gloss: "vui" },
    note: "r UỐN LƯỠI (gần 'r' tiếng Anh), l như 'l' tiếng Việt.",
  },
  // Nguyên âm dễ lẫn
  {
    id: "i-v", title: "i / ü", group: "vowel",
    a: { sound: "i", hanzi: "你", pinyin: "nǐ", tone: 3, gloss: "bạn" },
    b: { sound: "ü", hanzi: "女", pinyin: "nǚ", tone: 3, gloss: "nữ, con gái" },
    note: "i: môi dẹt. ü: giữ lưỡi như 'i' nhưng TRÒN MÔI (như đang huýt sáo).",
  },
  // Đuôi -n ↔ -ng (cực kỳ quan trọng với người Việt)
  {
    id: "an-ang", title: "an / ang", group: "nasal",
    a: { sound: "an", hanzi: "饭", pinyin: "fàn", tone: 4, gloss: "cơm" },
    b: { sound: "ang", hanzi: "放", pinyin: "fàng", tone: 4, gloss: "đặt, để" },
    note: "-n: đầu lưỡi CHẠM lợi trên. -ng: gốc lưỡi nâng, lưỡi KHÔNG chạm lợi (miệng hơi mở).",
  },
  {
    id: "en-eng", title: "en / eng", group: "nasal",
    a: { sound: "en", hanzi: "分", pinyin: "fēn", tone: 1, gloss: "phút; chia" },
    b: { sound: "eng", hanzi: "风", pinyin: "fēng", tone: 1, gloss: "gió" },
    note: "en đóng bằng '-n' (chạm lợi), eng đóng bằng '-ng' (gốc lưỡi nâng).",
  },
  {
    id: "in-ing", title: "in / ing", group: "nasal",
    a: { sound: "in", hanzi: "信", pinyin: "xìn", tone: 4, gloss: "thư; tin" },
    b: { sound: "ing", hanzi: "姓", pinyin: "xìng", tone: 4, gloss: "họ (tên họ)" },
    note: "in đuôi '-n' (như 'in'), ing đuôi '-ng' (như 'inh').",
  },
];

export function getConfusion(id: string): ConfusionPair | undefined {
  return CONFUSIONS.find((c) => c.id === id);
}
