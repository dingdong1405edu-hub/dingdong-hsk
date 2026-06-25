// Bộ dữ liệu PHIÊN ÂM (Pinyin) cho người mới bắt đầu — thanh mẫu (声母), vận mẫu
// (韵母) và thanh điệu (声调). Đây là nội dung tĩnh, được dùng để dựng bảng tra cứu
// và các bài học flashcard ở module "Chữ cái & phát âm".
//
// Mỗi âm kèm một chữ Hán ví dụ THẬT (để phát âm bằng Web Speech zh-CN — TTS đọc
// pinyin rời không chính xác, nên luôn phát qua chữ Hán) + pinyin có dấu thanh +
// nghĩa tiếng Việt + mẹo phát âm cho người Việt.

/** Một âm trong bảng phiên âm (thanh mẫu hoặc vận mẫu). */
export interface Sound {
  /** Ký hiệu pinyin của thanh/vận mẫu, vd "b", "zh", "ang". */
  sound: string;
  /** Chữ Hán ví dụ thật chứa âm này (dùng cho TTS + minh hoạ). */
  hanzi: string;
  /** Pinyin đầy đủ của chữ ví dụ, có dấu thanh, vd "bā". */
  pinyin: string;
  /** Thanh điệu của chữ ví dụ (1-4, 0 = thanh nhẹ) — để tô màu. */
  tone: number;
  /** Nghĩa tiếng Việt của chữ ví dụ. */
  gloss: string;
  /** Mẹo phát âm / cách đặt lưỡi cho người Việt. */
  hint: string;
  /** Nhóm con (để gom theo phần trong bảng + bài học). */
  family: string;
}

/** Một nhóm âm hiển thị trong bảng tra cứu, gắn với một bài luyện. */
export interface SoundGroup {
  family: string;
  title: string;
  /** id bài học để "Luyện nhóm này" nhảy thẳng vào. */
  lessonId: string;
}

// ── Thanh mẫu (声母) — 21 phụ âm đầu ──────────────────────────────────────────

export const INITIAL_GROUPS: SoundGroup[] = [
  { family: "labial", title: "Âm môi: b p m f", lessonId: "pinyin-initials-1" },
  { family: "alveolar", title: "Âm đầu lưỡi: d t n l", lessonId: "pinyin-initials-1" },
  { family: "velar", title: "Âm cuống lưỡi: g k h", lessonId: "pinyin-initials-2" },
  { family: "palatal", title: "Âm mặt lưỡi: j q x", lessonId: "pinyin-initials-2" },
  { family: "retroflex", title: "Âm uốn lưỡi: zh ch sh r", lessonId: "pinyin-initials-3" },
  { family: "sibilant", title: "Âm phẳng lưỡi: z c s", lessonId: "pinyin-initials-3" },
];

export const INITIALS: Sound[] = [
  // Âm môi (labials)
  { sound: "b", hanzi: "八", pinyin: "bā", tone: 1, gloss: "tám", family: "labial", hint: "Như 'p' tiếng Việt (trong 'pin'), KHÔNG bật hơi. Mím môi rồi mở ra." },
  { sound: "p", hanzi: "怕", pinyin: "pà", tone: 4, gloss: "sợ", family: "labial", hint: "Giống b nhưng BẬT HƠI mạnh — để tay trước miệng sẽ thấy hơi phụt ra." },
  { sound: "m", hanzi: "妈", pinyin: "mā", tone: 1, gloss: "mẹ", family: "labial", hint: "Như 'm' tiếng Việt." },
  { sound: "f", hanzi: "飞", pinyin: "fēi", tone: 1, gloss: "bay", family: "labial", hint: "Như 'ph' tiếng Việt: răng trên chạm nhẹ môi dưới." },
  // Âm đầu lưỡi (alveolars)
  { sound: "d", hanzi: "大", pinyin: "dà", tone: 4, gloss: "to, lớn", family: "alveolar", hint: "Như 't' tiếng Việt, KHÔNG bật hơi. Đầu lưỡi chạm lợi trên." },
  { sound: "t", hanzi: "他", pinyin: "tā", tone: 1, gloss: "anh ấy", family: "alveolar", hint: "Như 'th' tiếng Việt, BẬT HƠI mạnh." },
  { sound: "n", hanzi: "你", pinyin: "nǐ", tone: 3, gloss: "bạn", family: "alveolar", hint: "Như 'n' tiếng Việt." },
  { sound: "l", hanzi: "来", pinyin: "lái", tone: 2, gloss: "đến", family: "alveolar", hint: "Như 'l' tiếng Việt." },
  // Âm cuống lưỡi (velars)
  { sound: "g", hanzi: "高", pinyin: "gāo", tone: 1, gloss: "cao", family: "velar", hint: "Như 'c/k' tiếng Việt, KHÔNG bật hơi. Gốc lưỡi nâng lên." },
  { sound: "k", hanzi: "看", pinyin: "kàn", tone: 4, gloss: "xem, nhìn", family: "velar", hint: "Như 'kh' tiếng Việt, BẬT HƠI mạnh." },
  { sound: "h", hanzi: "好", pinyin: "hǎo", tone: 3, gloss: "tốt", family: "velar", hint: "Như 'h' nhưng sâu trong cổ họng (hơi giống 'kh' nhẹ)." },
  // Âm mặt lưỡi (palatals) — chỉ ghép với i, ü
  { sound: "j", hanzi: "鸡", pinyin: "jī", tone: 1, gloss: "gà", family: "palatal", hint: "Gần 'ch' mềm (như 'gi'), mặt lưỡi áp vòm, KHÔNG bật hơi. Chỉ đi với i, ü." },
  { sound: "q", hanzi: "七", pinyin: "qī", tone: 1, gloss: "bảy", family: "palatal", hint: "Giống j nhưng BẬT HƠI mạnh (gần 'ch' bật hơi). Chỉ đi với i, ü." },
  { sound: "x", hanzi: "西", pinyin: "xī", tone: 1, gloss: "phía tây", family: "palatal", hint: "Như 'x'/'s' rất mềm, mặt lưỡi gần vòm. Chỉ đi với i, ü." },
  // Âm uốn lưỡi (retroflex)
  { sound: "zh", hanzi: "中", pinyin: "zhōng", tone: 1, gloss: "giữa, Trung", family: "retroflex", hint: "UỐN LƯỠI: đầu lưỡi cong lên chạm vòm, gần 'tr', KHÔNG bật hơi." },
  { sound: "ch", hanzi: "吃", pinyin: "chī", tone: 1, gloss: "ăn", family: "retroflex", hint: "Uốn lưỡi như zh nhưng BẬT HƠI mạnh (gần 'tr' bật hơi)." },
  { sound: "sh", hanzi: "书", pinyin: "shū", tone: 1, gloss: "sách", family: "retroflex", hint: "Uốn lưỡi: như 's' nhưng lưỡi cong lên (gần 'sờ' nặng)." },
  { sound: "r", hanzi: "热", pinyin: "rè", tone: 4, gloss: "nóng", family: "retroflex", hint: "Uốn lưỡi: gần 'r' tiếng Anh, lưỡi cong, rung nhẹ." },
  // Âm phẳng lưỡi (dentals/sibilants)
  { sound: "z", hanzi: "在", pinyin: "zài", tone: 4, gloss: "ở, tại", family: "sibilant", hint: "PHẲNG LƯỠI: như 'ts' (gần 'dz'), đầu lưỡi sau răng, KHÔNG bật hơi." },
  { sound: "c", hanzi: "菜", pinyin: "cài", tone: 4, gloss: "rau, món ăn", family: "sibilant", hint: "Giống z nhưng BẬT HƠI mạnh (gần 'ts' bật hơi)." },
  { sound: "s", hanzi: "三", pinyin: "sān", tone: 1, gloss: "ba", family: "sibilant", hint: "PHẲNG LƯỠI: như 's'/'x' tiếng Việt, đầu lưỡi sau răng." },
];

// ── Vận mẫu (韵母) — phần vần ─────────────────────────────────────────────────

export const FINAL_GROUPS: SoundGroup[] = [
  { family: "simple", title: "Nguyên âm đơn: a o e i u ü", lessonId: "pinyin-finals-1" },
  { family: "compound", title: "Nguyên âm kép: ai ei ao ou", lessonId: "pinyin-finals-1" },
  { family: "group-i", title: "Vần ghép với i: ia ie iao iu", lessonId: "pinyin-finals-2" },
  { family: "group-u", title: "Vần ghép với u: ua uo uai ui", lessonId: "pinyin-finals-2" },
  { family: "group-v", title: "Vần ghép với ü: üe", lessonId: "pinyin-finals-2" },
  { family: "nasal-n", title: "Vần mũi đuôi -n: an en in un ün …", lessonId: "pinyin-finals-3" },
  { family: "nasal-ng", title: "Vần mũi đuôi -ng: ang eng ing ong …", lessonId: "pinyin-finals-3" },
  { family: "special", title: "Vần đặc biệt: er", lessonId: "pinyin-finals-3" },
];

export const FINALS: Sound[] = [
  // Nguyên âm đơn
  { sound: "a", hanzi: "啊", pinyin: "ā", tone: 1, gloss: "à (thán từ)", family: "simple", hint: "'a' mở rộng, như 'a' tiếng Việt." },
  { sound: "o", hanzi: "摸", pinyin: "mō", tone: 1, gloss: "sờ, chạm", family: "simple", hint: "'o' tròn môi, như 'ô' (sau b/p/m/f nghe gần 'uô')." },
  { sound: "e", hanzi: "喝", pinyin: "hē", tone: 1, gloss: "uống", family: "simple", hint: "'e' như 'ơ'/'ưa', KHÔNG tròn môi — khác hẳn 'e' tiếng Việt." },
  { sound: "i", hanzi: "一", pinyin: "yī", tone: 1, gloss: "một", family: "simple", hint: "'i' như 'i' tiếng Việt (sau z/c/s/zh/ch/sh/r thì 'i' đọc khác, ngậm âm)." },
  { sound: "u", hanzi: "五", pinyin: "wǔ", tone: 3, gloss: "năm", family: "simple", hint: "'u' tròn môi như 'u' tiếng Việt." },
  { sound: "ü", hanzi: "鱼", pinyin: "yú", tone: 2, gloss: "cá", family: "simple", hint: "'ü' = 'uy': miệng đọc 'i' nhưng tròn môi như 'u'." },
  // Nguyên âm kép
  { sound: "ai", hanzi: "爱", pinyin: "ài", tone: 4, gloss: "yêu", family: "compound", hint: "'a'+'i' → 'ai', như 'ai' tiếng Việt." },
  { sound: "ei", hanzi: "杯", pinyin: "bēi", tone: 1, gloss: "cốc, ly", family: "compound", hint: "'ei' như 'ây' tiếng Việt." },
  { sound: "ao", hanzi: "猫", pinyin: "māo", tone: 1, gloss: "mèo", family: "compound", hint: "'ao' như 'ao' tiếng Việt." },
  { sound: "ou", hanzi: "狗", pinyin: "gǒu", tone: 3, gloss: "chó", family: "compound", hint: "'ou' như 'âu' tiếng Việt." },
  // Vần ghép với i
  { sound: "ia", hanzi: "家", pinyin: "jiā", tone: 1, gloss: "nhà", family: "group-i", hint: "'ia' = 'i'+'a', đọc liền." },
  { sound: "ie", hanzi: "谢", pinyin: "xiè", tone: 4, gloss: "cảm ơn", family: "group-i", hint: "'ie' như 'iê' (e rõ hơn)." },
  { sound: "iao", hanzi: "小", pinyin: "xiǎo", tone: 3, gloss: "nhỏ", family: "group-i", hint: "'iao' như 'eo'/'iêu' đọc liền." },
  { sound: "iu", hanzi: "六", pinyin: "liù", tone: 4, gloss: "sáu", family: "group-i", hint: "'iu' viết tắt của 'iou', như 'iêu' ngắn." },
  // Vần ghép với u
  { sound: "ua", hanzi: "花", pinyin: "huā", tone: 1, gloss: "hoa", family: "group-u", hint: "'ua' = 'u'+'a'." },
  { sound: "uo", hanzi: "我", pinyin: "wǒ", tone: 3, gloss: "tôi", family: "group-u", hint: "'uo' như 'uô'." },
  { sound: "uai", hanzi: "快", pinyin: "kuài", tone: 4, gloss: "nhanh", family: "group-u", hint: "'uai' = 'u'+'ai'." },
  { sound: "ui", hanzi: "水", pinyin: "shuǐ", tone: 3, gloss: "nước", family: "group-u", hint: "'ui' viết tắt của 'uei', như 'uây' ngắn." },
  // Vần ghép với ü
  { sound: "üe", hanzi: "月", pinyin: "yuè", tone: 4, gloss: "tháng, trăng", family: "group-v", hint: "'üe' = 'ü'+'e'." },
  // Vần mũi đuôi -n
  { sound: "an", hanzi: "饭", pinyin: "fàn", tone: 4, gloss: "cơm", family: "nasal-n", hint: "'an' như 'an' tiếng Việt — đầu lưỡi chạm lợi, ngậm '-n'." },
  { sound: "en", hanzi: "很", pinyin: "hěn", tone: 3, gloss: "rất", family: "nasal-n", hint: "'en' như 'ân', đuôi '-n'." },
  { sound: "in", hanzi: "信", pinyin: "xìn", tone: 4, gloss: "thư", family: "nasal-n", hint: "'in' như 'in' tiếng Việt, đuôi '-n'." },
  { sound: "un", hanzi: "春", pinyin: "chūn", tone: 1, gloss: "mùa xuân", family: "nasal-n", hint: "'un' viết tắt 'uen', như 'uân'." },
  { sound: "ün", hanzi: "军", pinyin: "jūn", tone: 1, gloss: "quân đội", family: "nasal-n", hint: "'ün' = 'ü'+'n'." },
  { sound: "ian", hanzi: "天", pinyin: "tiān", tone: 1, gloss: "trời, ngày", family: "nasal-n", hint: "'ian' đọc gần 'iên'." },
  { sound: "uan", hanzi: "关", pinyin: "guān", tone: 1, gloss: "đóng", family: "nasal-n", hint: "'uan' = 'u'+'an'." },
  { sound: "üan", hanzi: "远", pinyin: "yuǎn", tone: 3, gloss: "xa", family: "nasal-n", hint: "'üan' đọc gần 'uyên'." },
  // Vần mũi đuôi -ng
  { sound: "ang", hanzi: "忙", pinyin: "máng", tone: 2, gloss: "bận", family: "nasal-ng", hint: "'ang' đuôi '-ng' (gốc lưỡi nâng, không chạm lợi) — khác '-n'." },
  { sound: "eng", hanzi: "冷", pinyin: "lěng", tone: 3, gloss: "lạnh", family: "nasal-ng", hint: "'eng' như 'âng', đuôi '-ng'." },
  { sound: "ing", hanzi: "听", pinyin: "tīng", tone: 1, gloss: "nghe", family: "nasal-ng", hint: "'ing' như 'inh', đuôi '-ng'." },
  { sound: "ong", hanzi: "红", pinyin: "hóng", tone: 2, gloss: "đỏ", family: "nasal-ng", hint: "'ong' như 'ung/ông', đuôi '-ng'." },
  { sound: "iang", hanzi: "想", pinyin: "xiǎng", tone: 3, gloss: "muốn, nghĩ", family: "nasal-ng", hint: "'iang' = 'i'+'ang'." },
  { sound: "uang", hanzi: "床", pinyin: "chuáng", tone: 2, gloss: "giường", family: "nasal-ng", hint: "'uang' = 'u'+'ang'." },
  { sound: "iong", hanzi: "熊", pinyin: "xióng", tone: 2, gloss: "gấu", family: "nasal-ng", hint: "'iong' = 'i'+'ong'." },
  // Đặc biệt
  { sound: "er", hanzi: "二", pinyin: "èr", tone: 4, gloss: "hai", family: "special", hint: "'er' uốn lưỡi: 'ơ' + cong lưỡi (gốc của hiện tượng 儿化)." },
];

// ── Thanh điệu (声调) ─────────────────────────────────────────────────────────

export interface ToneInfo {
  /** 1-4, 0 = thanh nhẹ. */
  tone: number;
  name: string;
  /** Chữ cái mang dấu thanh để minh hoạ, vd "ā". */
  mark: string;
  hanzi: string;
  pinyin: string;
  gloss: string;
  desc: string;
}

export const TONES: ToneInfo[] = [
  { tone: 1, name: "Thanh 1 · 阴平", mark: "ā", hanzi: "妈", pinyin: "mā", gloss: "mẹ", desc: "Cao và đều, kéo dài bằng phẳng — như hát giữ một nốt cao (5-5)." },
  { tone: 2, name: "Thanh 2 · 阳平", mark: "á", hanzi: "麻", pinyin: "má", gloss: "cây gai; tê", desc: "Đi lên, như khi hỏi lại ngạc nhiên 'Hả?' trong tiếng Việt (3-5)." },
  { tone: 3, name: "Thanh 3 · 上声", mark: "ǎ", hanzi: "马", pinyin: "mǎ", gloss: "ngựa", desc: "Xuống thấp rồi vòng lên — uốn cong như dấu hỏi (2-1-4)." },
  { tone: 4, name: "Thanh 4 · 去声", mark: "à", hanzi: "骂", pinyin: "mà", gloss: "mắng, chửi", desc: "Từ cao đổ xuống dứt khoát, như ra lệnh hoặc dấu nặng mạnh (5-1)." },
  { tone: 0, name: "Thanh nhẹ · 轻声", mark: "a", hanzi: "吗", pinyin: "ma", gloss: "trợ từ hỏi", desc: "Đọc nhẹ và ngắn, không nhấn — thường ở cuối câu (vd câu hỏi 吗)." },
];

// Tên thanh điệu ngắn (dùng cho nút chọn trong quiz).
export const TONE_SHORT: Record<number, string> = {
  1: "Thanh 1",
  2: "Thanh 2",
  3: "Thanh 3",
  4: "Thanh 4",
  0: "Thanh nhẹ",
};
