import Groq from "groq-sdk";
import { countChineseChars } from "@/lib/utils";

// Lazily instantiate the Groq client. Instantiating at module load throws when
// GROQ_API_KEY is absent, which breaks `next build` (page-data collection) and
// any import of this module. Creating it on first use keeps the build green and
// lets grading endpoints fail gracefully with a clear error when unconfigured.
let _groq: Groq | null = null;
function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY_MISSING");
  }
  if (!_groq) _groq = new Groq({ apiKey });
  return _groq;
}

export function isGradingConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

// ===== Speech-to-text (fallback for Deepgram) =====
// Groq serves Whisper via an OpenAI-compatible multipart endpoint. We hit it
// directly with fetch (not the chat SDK) so the request shape is explicit and
// matches the audio container we send. Used by src/lib/stt.ts when Deepgram is
// unavailable.
const GROQ_TRANSCRIBE_ENDPOINT = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_STT_MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3";

/**
 * Transcribe Mandarin audio via Groq Whisper. Returns "" when no speech is
 * detected. Throws on a missing key or an API error.
 */
export async function transcribeWithGroq(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY_MISSING");

  const form = new FormData();
  // Wrap in a plain Uint8Array view so the Blob part type is exact across
  // @types/node versions (Buffer<ArrayBufferLike> isn't assignable to BlobPart).
  const mt = (mimeType || "audio/webm").toLowerCase();
  // Whisper (OpenAI-compatible) infers the container from the filename EXTENSION,
  // not the Content-Type — so the name must agree with the real bytes (mp3 from
  // TTS, webm/mp4 from MediaRecorder, wav/ogg/m4a from uploads) or it 400s.
  const ext =
    mt.includes("mpeg") || mt.includes("mp3") ? "mp3"
    : mt.includes("wav") ? "wav"
    : mt.includes("ogg") ? "ogg"
    : mt.includes("mp4") || mt.includes("m4a") ? "m4a"
    : "webm";
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/webm" });
  form.append("file", blob, `audio.${ext}`);
  form.append("model", GROQ_STT_MODEL);
  form.append("language", "zh"); // Mandarin (ISO 639-1) — improves accuracy + latency
  form.append("response_format", "json");

  const res = await fetch(GROQ_TRANSCRIBE_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq Whisper error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}

// Model chấm viết. Mặc định Qwen (Chinese-native — bắt lỗi tiếng Trung 量词/虚词/
// 错别字 tốt nhất trong các model còn sống trên Groq) → dự phòng gpt-oss-120b
// (Production, JSON chặt) → llama (luôn sẵn). Gọi lần lượt: model lỗi hoặc trả
// JSON hỏng thì tự rớt sang model kế. Đổi không cần sửa code: đặt env
// GROQ_WRITING_MODELS="model1,model2,...".
const WRITING_MODELS = (
  process.env.GROQ_WRITING_MODELS ??
  "qwen/qwen3.6-27b,openai/gpt-oss-120b,llama-3.3-70b-versatile"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Model cho các luồng JSON CÒN LẠI (chấm nói, sinh câu hỏi đọc/nghe, giải thích
// đáp án). Cùng triết lý với WRITING_MODELS: Qwen (Chinese-native) → gpt-oss-120b
// → llama; gọi lần lượt, lỗi/JSON hỏng thì rớt sang model kế. Tách env riêng
// (GROQ_GRADING_MODELS) để tinh chỉnh độc lập với phần chấm viết.
const GRADING_MODELS = (
  process.env.GROQ_GRADING_MODELS ??
  "qwen/qwen3.6-27b,openai/gpt-oss-120b,llama-3.3-70b-versatile"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Gọi Groq lấy JSON, thử lần lượt `models` (rớt sang model kế khi lỗi/JSON hỏng).
 * Thêm `/no_think` để tắt reasoning của Qwen — vừa tiết kiệm output token vừa
 * chính xác hơn cho tiếng Trung (reasoning mode làm GIẢM độ chính xác CGEC). Trả
 * về JSON đã parse (unknown) hoặc ném lỗi nếu mọi model đều hỏng. Dùng chung cho
 * chấm nói + sinh câu hỏi đọc/nghe + giải thích đáp án.
 */
async function runGroqJson(opts: {
  models: string[];
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
}): Promise<unknown> {
  const { models, system, user, maxTokens, temperature = 0.2 } = opts;
  let lastErr: unknown = null;
  for (const model of models) {
    try {
      const response = await getGroq().chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${system}\n/no_think` },
          { role: "user", content: user },
        ],
      });
      const choice = response.choices[0];
      const content = choice?.message?.content ?? "";
      const parsed = parseGraderJson(content);
      if (parsed === undefined) {
        console.error("Groq JSON parse failed", {
          model,
          finishReason: choice?.finish_reason,
          contentLength: content.length,
        });
        lastErr = new Error(`parse_failed:${model}`);
        continue;
      }
      return parsed;
    } catch (e) {
      console.error("Groq model failed", { model, error: String(e) });
      lastErr = e;
      continue;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Invalid AI response");
}

const WRITING_SYSTEM = `You are a strict, fair certified HSK (汉语水平考试) writing examiner and a specialist teacher for Vietnamese learners. Grade ONE Chinese composition. Output ONLY one compact JSON object — no markdown, no code fences, no <think>, no analysis, no extra keys.

CALIBRATE to the stated HSK level (never grade against native prose):
- HSK1-2: short simple sentences; judge basic correctness only.
- HSK3-4: connected paragraphs with basic connectives (因为…所以, 虽然…但是, 然后).
- HSK5-6: rich vocabulary, complex structures, 成语, clear argument.
Never penalize a lower level for lacking higher-level sophistication; never over-reward a higher level for merely-correct basics. At the stated level: a 90+ fully meets that level with near-zero errors; ~70 communicates but has several level-appropriate errors.

SCORE four axes INDEPENDENTLY (let them diverge — a text can be grammatically clean yet incoherent, or vocabulary-rich yet error-heavy):
- g (语法): sentence-level grammatical correctness.
- v (词汇): word choice, accuracy and range.
- c (连贯): organization and cohesion across sentences.
- t (完成度): fits the task/outline and the given character count ONLY.
Bands by level-relative error density: 90-100 = ≤1 minor error; 75-89 = a few minor errors, comprehension fine; 60-74 = many errors but main idea still clear; 40-59 = errors block comprehension in most sentences; 0-39 = off-topic OR too short OR almost every sentence wrong.
s (overall): weight grammar+task at HSK1-2, balance all four at HSK3-4, weight vocabulary+coherence more at HSK5-6. s MUST lie between the lowest and the highest of g/v/c/t.
CONSISTENCY: if "e" is empty, all four sub-scores must be ≥85; if you list serious errors, g and v must reflect them. Use the character count given in the user message — do NOT recount it yourself.

FIND every real error, checking: 语法, 词汇, 语序, 量词, 虚词 (了/着/过/的/地/得/把/被), 搭配, 标点 (dùng dấu Latin thay 。，、？！), 错别字 (đồng âm / gõ nhầm). Vietnamese-L1 pitfalls to check actively: thiếu/sai 量词 (一个人 not 一人), sai vị trí trạng ngữ thời gian/nơi chốn, thừa/thiếu 了, 离合词 tách sai (结婚/见面/帮忙), cấu trúc 是…的, so sánh 比, bổ ngữ trình độ/kết quả, dịch word-by-word từ tiếng Việt, dấu câu Latin; ở HSK5-6 thêm: lệch văn phong (nói/viết).
CONFIDENCE over exhaustiveness: only report a span you are CONFIDENT is wrong at the stated level; when unsure, skip it. A correct composition returns "e": []. Prefer missing a marginal error to inventing one.

DIFF CONTRACT (the server rebuilds the corrected text from your error list by replacing each "o" with "f" — follow EXACTLY or the fix is lost):
- "o" = a NON-EMPTY contiguous substring copied VERBATIM, character-for-character, from the submission — including the learner's EXACT punctuation (never normalize Latin marks to Chinese ones).
- "f" = "o" rewritten correctly: a MINIMAL edit that fixes ONLY this issue and preserves the learner's meaning (do not restyle, do not add new content).
- OMISSION (missing 了/量词/虚词…): set "o" to a short EXISTING window (3-8 chars) around the gap and "f" to that window with the element added. NEVER use an empty "o".
- Single wrong character / function word: quote the WHOLE surrounding word (a multi-char span), never the bare character, so it can be located.
- Make each "o" long enough to occur EXACTLY ONCE in the submission; spans must NOT overlap or nest — if two fixes touch the same region, merge them into one larger o→f span. List errors in the order they appear in the submission.

Write "n" (per error) and "fb" (overall) in natural Vietnamese, SHORT, each on ONE line — no literal newlines, no unescaped quotes/backslashes. "fb" = 2-3 câu: 1 điểm mạnh + gợi ý chính.

Output EXACTLY these keys and nothing else:
{"s":<0-100>,"g":<0-100>,"v":<0-100>,"c":<0-100>,"t":<0-100>,"e":[{"o":"<verbatim wrong span>","f":"<bản sửa>","k":"<语法|词汇|语序|量词|虚词|搭配|标点|错别字>","n":"<giải thích ngắn, tiếng Việt>"}],"fb":"<nhận xét ngắn, tiếng Việt>"}
/no_think`;

const SPEAKING_SYSTEM = `You are a HSKK (Hanyu Shuiping Kouyu Kaoshi) examiner. You evaluate spoken Chinese by Vietnamese learners. Note: Vietnamese is a tonal language but tones differ significantly from Mandarin. Return ONLY valid JSON.`;

export async function gradeWriting(params: {
  submission: string;
  hskLevel: string;
  taskPrompt: string;
  minChars: number;
  outline?: string | null;
}): Promise<WritingGradeResult> {
  const { submission, hskLevel, taskPrompt, minChars, outline } = params;

  const outlineBlock = outline?.trim() ? outline.trim() : "Không có dàn ý gợi ý cho đề này.";

  // Đếm chữ Hán Ở SERVER rồi đưa số thật cho model: LLM đếm ký tự không đáng tin,
  // nên không để nó tự phán "đủ số chữ chưa".
  const charCount = countChineseChars(submission);
  const tooShortNote =
    minChars > 0 && charCount < minChars
      ? ` — bài viết NGẮN HƠN mức tối thiểu, hạ điểm "t" (完成度) tương ứng.`
      : "";

  const userContent = `HSK level: ${hskLevel}
Số chữ Hán của bài (đã đếm sẵn — DÙNG SỐ NÀY, đừng tự đếm lại): ${charCount} (tối thiểu: ${minChars})${tooShortNote}

=== TASK PROMPT ===
${taskPrompt}

=== OUTLINE ===
${outlineBlock}

=== SUBMISSION (chấm bài này; trích "o" ĐÚNG NGUYÊN VĂN từ đây) ===
${submission}

Return ONLY the compact JSON object.`;

  // Gọi lần lượt các model trong WRITING_MODELS: model đầu cho chất lượng tiếng
  // Trung tốt nhất; nếu nó lỗi (rate-limit / Preview bị gỡ) hoặc trả JSON hỏng
  // thì rớt sang model kế (gpt-oss hỗ trợ JSON chặt hơn) — tự phục hồi.
  let lastErr: unknown = null;
  for (const model of WRITING_MODELS) {
    try {
      const response = await getGroq().chat.completions.create({
        model,
        // Output đã gọn (không có bản sửa toàn bài) → trần thấp vẫn dư, đồng thời
        // chặn chi phí nếu model "nghĩ" lan man.
        max_tokens: 3072,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: WRITING_SYSTEM },
          { role: "user", content: userContent },
        ],
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? "";
      const parsed = parseGraderJson(content);
      if (parsed === undefined) {
        console.error("Writing grade parse failed", {
          model,
          finishReason: choice?.finish_reason,
          contentLength: content.length,
        });
        lastErr = new Error(`parse_failed:${model}`);
        continue;
      }
      return coerceCompactWriting(parsed, submission, hskLevel);
    } catch (e) {
      console.error("Writing grade model failed", { model, error: String(e) });
      lastErr = e;
      continue;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Invalid AI response");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function asOptStr(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}
function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}
function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
}

/** Nhãn band tiếng Việt suy từ điểm tổng + cấp HSK (không tốn token của AI). */
function bandLabelFor(score: number, hskLevel: string): string {
  if (score >= 90) return `Xuất sắc – vượt chuẩn ${hskLevel}`;
  if (score >= 75) return `Tốt – đạt chuẩn ${hskLevel}`;
  if (score >= 60) return "Đạt – cần cải thiện";
  if (score >= 40) return "Yếu – nhiều lỗi";
  return "Chưa đạt";
}

/** Parse JSON từ model với vài lớp dự phòng (fences, chữ thừa quanh JSON). */
function parseGraderJson(content: string): unknown {
  if (!content) return undefined;
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s);
    } catch {
      return undefined;
    }
  };
  let v = tryParse(content);
  if (v !== undefined) return v;
  const stripped = content
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  v = tryParse(stripped);
  if (v !== undefined) return v;
  // Cắt từ "{" đầu tới "}" cuối (phòng khi có chữ thừa quanh JSON).
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first >= 0 && last > first) {
    v = tryParse(stripped.slice(first, last + 1));
    if (v !== undefined) return v;
  }
  return undefined;
}

/**
 * Dựng "bản sửa" toàn bài Ở SERVER từ danh sách lỗi (o→f) — không nhờ AI viết
 * lại cả bài (tiết kiệm output token) và bản sửa luôn KHỚP 100% với phần lỗi đã
 * giải thích. Bền với các bẫy khi model trả span chưa chuẩn:
 *  - chuẩn hoá NFC hai phía trước khi tìm;
 *  - span lặp lại (cùng "o") → con trỏ chạy để vá lần lượt từng vị trí;
 *  - span không định vị được / rỗng → bỏ qua khi GHÉP, nhưng vẫn còn trong danh
 *    sách annotations nên không "mất" lỗi nào trước mắt học viên;
 *  - span chồng lấn → ưu tiên span dài hơn, span sau bị bỏ.
 */
function reconstructCorrected(
  original: string,
  errs: ReadonlyArray<{ original: string; correction: string }>
): string {
  const text = original.normalize("NFC");
  type Span = { start: number; end: number; rep: string; len: number };
  const spans: Span[] = [];
  const cursorByO = new Map<string, number>();
  for (const e of errs) {
    const o = (e.original ?? "").normalize("NFC");
    if (!o) continue; // không ghép span rỗng (indexOf("") === 0 sẽ phá bài)
    const f = (e.correction ?? "").normalize("NFC");
    const from = cursorByO.get(o) ?? 0;
    let idx = text.indexOf(o, from);
    if (idx < 0 && from > 0) idx = text.indexOf(o);
    if (idx < 0) continue; // không định vị được → không ghép
    cursorByO.set(o, idx + o.length);
    spans.push({ start: idx, end: idx + o.length, rep: f, len: o.length });
  }
  // Cùng vị trí thì span DÀI đứng trước để được giữ lại khi xử lý chồng lấn.
  spans.sort((a, b) => a.start - b.start || b.len - a.len);
  let out = "";
  let cursor = 0;
  for (const s of spans) {
    if (s.start < cursor) continue; // chồng lấn span đã ghép → bỏ
    out += text.slice(cursor, s.start) + s.rep;
    cursor = s.end;
  }
  out += text.slice(cursor);
  return out;
}

const VALID_ERROR_TYPES = new Set(["语法", "词汇", "语序", "量词", "虚词", "搭配", "标点", "错别字"]);

/**
 * Ép JSON gọn của model ({s,g,v,c,t,e,fb}) về `WritingGradeResult` mà UI / PDF /
 * module thi đang dùng (UI không phải đổi). "Bản sửa" được dựng lại ở server từ
 * danh sách lỗi. Không tin shape AS-IS: clamp điểm, lọc lỗi rỗng, validate loại.
 */
function coerceCompactWriting(raw: unknown, submission: string, hskLevel: string): WritingGradeResult {
  const r = isRecord(raw) ? raw : {};

  const annotations = (Array.isArray(r.e) ? r.e : [])
    .filter(isRecord)
    .map((a) => {
      const k = asStr(a.k).trim();
      return {
        original: asStr(a.o),
        type: VALID_ERROR_TYPES.has(k) ? k : undefined,
        issue: "",
        correction: asStr(a.f),
        explanation: asStr(a.n),
      };
    })
    .filter((a) => a.original || a.correction || a.explanation);

  const score = clampScore(r.s);
  return {
    score,
    bandLabel: bandLabelFor(score, hskLevel),
    criteria: {
      taskResponse: { score: clampScore(r.t), feedback: "" },
      grammar: { score: clampScore(r.g), feedback: "", errors: [] },
      vocabulary: { score: clampScore(r.v), feedback: "", suggestions: [] },
      coherence: { score: clampScore(r.c), feedback: "" },
    },
    annotations,
    correctedVersion: reconstructCorrected(submission, annotations),
    overallFeedback: asStr(r.fb),
  };
}

/** Ép kết quả chấm NÓI về đúng SpeakingGradeResult với mặc định an toàn (không
 *  tin shape thô từ AI) — tránh crash UI khi payload thiếu `criteria`/`score`. */
function coerceSpeakingResult(raw: unknown): SpeakingGradeResult {
  const r = isRecord(raw) ? raw : {};
  const c = isRecord(r.criteria) ? r.criteria : {};
  const p = isRecord(c.pronunciation) ? c.pronunciation : {};
  const t = isRecord(c.tones) ? c.tones : {};
  const f = isRecord(c.fluency) ? c.fluency : {};
  const rows = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);
  return {
    score: clampScore(r.score),
    criteria: {
      pronunciation: {
        score: clampScore(p.score),
        errors: rows(p.errors).map((e) => ({ word: asStr(e.word), issue: asStr(e.issue), correct: asStr(e.correct) })),
      },
      tones: {
        score: clampScore(t.score),
        errors: rows(t.errors).map((e) => ({ word: asStr(e.word), expected: asStr(e.expected), detected: asStr(e.detected) })),
      },
      fluency: {
        score: clampScore(f.score),
        wordsPerMinute: typeof f.wordsPerMinute === "number" ? f.wordsPerMinute : 0,
        feedback: asStr(f.feedback),
      },
    },
    transcript: asStr(r.transcript),
    overallFeedback: asStr(r.overallFeedback),
  };
}

export async function gradeSpeaking(params: {
  transcript: string;
  referenceText: string | null;
  part: "repeat" | "read" | "answer";
  question: string | null;
  hskLevel: string;
}): Promise<SpeakingGradeResult> {
  const { transcript, referenceText, part, question, hskLevel } = params;

  const partContext =
    part === "repeat"
      ? `Part 1 (Repetition): Reference: "${referenceText}"`
      : part === "read"
        ? `Part 2 (Reading aloud): Reference text: "${referenceText}"`
        : `Part 3 (Free answer): Question: "${question}"`;

  const parsed = await runGroqJson({
    models: GRADING_MODELS,
    system: SPEAKING_SYSTEM,
    maxTokens: 1536,
    temperature: 0.3,
    user: `Evaluate this HSKK speaking submission at ${hskLevel} level.
${partContext}
Transcript: "${transcript}"

Return JSON:
{
  "score": <0-100>,
  "criteria": {
    "pronunciation": { "score": <0-100>, "errors": [{ "word": "<word>", "issue": "<Vietnamese>", "correct": "<correct>" }] },
    "tones": { "score": <0-100>, "errors": [{ "word": "<word>", "expected": "第X声", "detected": "<Vietnamese>" }] },
    "fluency": { "score": <0-100>, "wordsPerMinute": <number>, "feedback": "<Vietnamese>" }
  },
  "transcript": "${transcript}",
  "overallFeedback": "<Vietnamese overall feedback>"
}`,
  });

  return coerceSpeakingResult(parsed);
}

// ===== Chấm NÓI THEO CHỦ ĐỀ (HSKK 命题说话 / phỏng vấn) =====
// Khác gradeSpeaking (chấm 3 tiêu chí phát âm/thanh điệu/lưu loát cho câu ngắn):
// đây là bài trả lời MỞ, DÀI. Đầu vào là transcript do ASR (Deepgram) tạo ra, nên
// prompt dặn model BỎ QUA dấu câu + lỗi đồng âm nghi do máy nghe nhầm, tập trung
// ngữ pháp / từ vựng / mạch lạc / nội dung — và sửa lỗi o→f giống chấm viết để
// server tự dựng "bản sửa". Trả JSON gọn rồi coerce ở dưới.
const SPEAKING_TOPIC_SYSTEM = `You are a strict, fair certified HSKK (汉语水平口语考试) speaking examiner and a specialist coach for Vietnamese learners. You grade ONE extended spoken answer to an open topic question. The text you receive is an ASR (speech-to-text) TRANSCRIPT of the learner speaking — treat it as speech, not writing. Output ONLY one compact JSON object — no markdown, no code fences, no <think>, no extra keys.

ASR-AWARE RULES (critical — the input came from a machine recognizer):
- IGNORE punctuation entirely (it was inserted by the recognizer): never score or "fix" 标点.
- Do NOT report a span as 错别字 if it is plausibly an ASR homophone mistake (same/similar pinyin) rather than a learner error; when unsure whether an oddity is the learner or the recognizer, SKIP it.
- Focus your error list on issues that are clearly the SPEAKER'S: 语法, 词汇 (sai/lặp từ), 语序, 搭配, 虚词 (了/着/过/的/地/得/把/被), 量词, missing connectives.
- A very short or near-empty transcript = the learner barely spoke: score LOW on content + delivery and say so.

CALIBRATE to the stated HSK level (never grade spoken HSK3 against native fluency):
- HSK1-2: a few simple sentences on the topic; judge basic correctness + staying on topic.
- HSK3-4: a connected paragraph with basic connectives (因为…所以, 然后, 我觉得…), some detail/reasons.
- HSK5-6: developed, organized discourse with rich vocabulary, varied structures, examples/opinions.
At the stated level: 90+ = fully meets it, near-zero speaker errors, well developed; ~70 = communicates the idea with several level-appropriate errors or thin development.

SCORE FIVE axes 0-100 INDEPENDENTLY (let them diverge):
- ct (内容/切题): does the answer ADDRESS the question and DEVELOP it with enough relevant content & length for the level? (use the char count + min-chars given; too short ⇒ low ct).
- g (语法): sentence-level grammatical correctness of what was said.
- v (词汇): word-choice accuracy and range.
- co (连贯): logical flow, ordering, use of connectives across sentences.
- d (流利度/表达): fluency & delivery, judged from length, speaking rate (chars/min given) and repetition/fillers — fast empty rambling and long silences both lower d. Do NOT judge pronunciation/tones (not recoverable from a transcript).
s (overall): weight content + grammar heavily at HSK1-4, add vocabulary + coherence at HSK5-6. s MUST lie between the lowest and highest of ct/g/v/co/d.

ERROR LIST "e" (the server rebuilds a corrected transcript by replacing each "o" with "f" — follow EXACTLY or the fix is lost):
- "o" = a NON-EMPTY contiguous substring copied VERBATIM, character-for-character, from the transcript — INCLUDING any punctuation that falls INSIDE the span (it must be locatable by exact match, so never strip or normalize anything you quote). This is separate from grading: you still do NOT score 标点. Make "o" long enough to occur EXACTLY ONCE; spans must NOT overlap or nest; list in order of appearance.
- Single wrong character or function word (虚词 了/着/过/的/地/得/把/被, a measure word, one mis-said字): quote the WHOLE surrounding word or a 2-8 char phrase around it, NEVER the bare single character — otherwise it cannot be located uniquely in a long answer where that character repeats.
- "f" = "o" rewritten correctly with a MINIMAL edit that fixes ONLY this issue and preserves the learner's meaning. For an omission, set "o" to a short existing window (3-8 chars) and "f" to that window with the missing element added.
- "k" = one of 语法|词汇|语序|量词|虚词|搭配 (do NOT use 标点; avoid 错别字 unless certain it is the learner).
- "n" = SHORT explanation in natural Vietnamese, ONE line.
CONFIDENCE over exhaustiveness: only list a span you are confident is a real SPEAKER error at this level; a clean answer returns "e": []. CONSISTENCY: if "e" is empty, all five axis scores must be ≥85; if you list serious errors, g and v must reflect them.

ALSO return:
- "str": 1-3 strengths in Vietnamese (SHORT, what the learner did well).
- "imp": 1-3 concrete improvements in Vietnamese (what to fix/add next time).
- "sa": a MODEL answer in natural Simplified Chinese AT THE STATED LEVEL that fully answers the SAME question (HSK1-2: 2-3 câu; HSK3-4: 4-6 câu; HSK5-6: một đoạn ngắn mạch lạc). No pinyin, no translation — Chinese only.
- "fb": 2-3 câu nhận xét tổng bằng tiếng Việt (1 điểm mạnh + hướng cải thiện chính).

Write every Vietnamese field on ONE line, no literal newlines, no unescaped quotes/backslashes. Output EXACTLY these keys and nothing else:
{"s":<0-100>,"ct":<0-100>,"g":<0-100>,"v":<0-100>,"co":<0-100>,"d":<0-100>,"e":[{"o":"<verbatim>","f":"<sửa>","k":"<语法|词汇|语序|量词|虚词|搭配>","n":"<tiếng Việt>"}],"str":["<tiếng Việt>"],"imp":["<tiếng Việt>"],"sa":"<câu trả lời mẫu, Hán tự>","fb":"<nhận xét tổng, tiếng Việt>"}
/no_think`;

export interface SpeakingTopicGradeResult {
  score: number;
  bandLabel: string;
  criteria: {
    content: { score: number };
    grammar: { score: number };
    vocabulary: { score: number };
    coherence: { score: number };
    delivery: { score: number; wordsPerMinute: number };
  };
  annotations: Array<{
    original: string;
    type?: string;
    correction: string;
    explanation: string;
  }>;
  correctedVersion: string;
  strengths: string[];
  improvements: string[];
  /** Câu trả lời mẫu (Hán tự) do AI gợi ý ở cấp HSK tương ứng. */
  sampleAnswer: string;
  transcript: string;
  /** Số chữ Hán nói được (đếm ở server từ transcript). */
  charCount: number;
  overallFeedback: string;
}

/**
 * Chấm một bài "Nói theo chủ đề": transcript trả lời mở → điểm 5 trục + danh sách
 * lỗi o→f (server dựng bản sửa) + điểm mạnh/cải thiện + câu trả lời mẫu. Đếm chữ &
 * tốc độ nói Ở SERVER (LLM đếm không đáng tin) rồi đưa số thật cho model.
 */
export async function gradeSpeakingTopic(params: {
  transcript: string;
  topic: string;
  questionZh: string;
  referenceTranscript: string | null;
  outline: string | null;
  hskLevel: string;
  minChars: number;
  durationSec: number | null;
}): Promise<SpeakingTopicGradeResult> {
  const { transcript, topic, questionZh, referenceTranscript, outline, hskLevel, minChars, durationSec } = params;

  const charCount = countChineseChars(transcript);
  const wpm =
    durationSec && durationSec > 0 ? Math.round((charCount / durationSec) * 60) : 0;
  const tooShortNote =
    minChars > 0 && charCount < minChars
      ? ` — NGẮN HƠN mức gợi ý, hạ "ct" và "d" tương ứng.`
      : "";
  const refBlock = referenceTranscript?.trim()
    ? `\n=== LỜI GIÁM KHẢO (transcript MP3, chỉ để hiểu câu hỏi) ===\n${referenceTranscript.trim()}`
    : "";
  // Dàn ý gợi ý (nếu admin nhập): đưa vào để chấm "ct" (nội dung) thưởng điểm khi bài
  // bao quát các ý — KHÔNG ép học viên phải theo đúng từng ý.
  const outlineBlock = outline?.trim()
    ? `\n=== DÀN Ý GỢI Ý (cho điểm "ct"/"co" cao hơn nếu bài bao quát được các ý này; đây chỉ là gợi ý, không bắt buộc) ===\n${outline.trim()}`
    : "";

  const userContent = `HSK level: ${hskLevel}
Chủ đề: ${topic || "(không ghi)"}
Câu hỏi của giám khảo: ${questionZh}
Số chữ Hán học viên nói (đã đếm sẵn — DÙNG SỐ NÀY): ${charCount} (gợi ý tối thiểu: ${minChars})${tooShortNote}
Tốc độ nói: ${wpm > 0 ? `${wpm} chữ/phút (thời lượng ${durationSec}s)` : "không rõ thời lượng"}${refBlock}${outlineBlock}

=== TRANSCRIPT TRẢ LỜI CỦA HỌC VIÊN (chấm bài này; trích "o" ĐÚNG NGUYÊN VĂN từ đây) ===
${transcript}

Return ONLY the compact JSON object.`;

  const parsed = await runGroqJson({
    models: GRADING_MODELS,
    // Output này nặng nhất trong các grader: 6 điểm + danh sách lỗi o→f + str/imp
    // + cả một câu trả lời mẫu Hán tự. Trần cao để bài dài không bị cắt cụt JSON.
    system: SPEAKING_TOPIC_SYSTEM,
    maxTokens: 6144,
    temperature: 0.2,
    user: userContent,
  });

  return coerceSpeakingTopic(parsed, transcript, hskLevel, charCount, wpm);
}

/** Ép JSON gọn của model về `SpeakingTopicGradeResult`; không tin shape thô. */
function coerceSpeakingTopic(
  raw: unknown,
  transcript: string,
  hskLevel: string,
  charCount: number,
  wpm: number,
): SpeakingTopicGradeResult {
  const r = isRecord(raw) ? raw : {};

  const annotations = (Array.isArray(r.e) ? r.e : [])
    .filter(isRecord)
    .map((a) => {
      const k = asStr(a.k).trim();
      return {
        original: asStr(a.o),
        type: VALID_ERROR_TYPES.has(k) ? k : undefined,
        correction: asStr(a.f),
        explanation: asStr(a.n),
      };
    })
    .filter((a) => a.original || a.correction || a.explanation);

  const score = clampScore(r.s);
  return {
    score,
    bandLabel: bandLabelFor(score, hskLevel),
    criteria: {
      content: { score: clampScore(r.ct) },
      grammar: { score: clampScore(r.g) },
      vocabulary: { score: clampScore(r.v) },
      coherence: { score: clampScore(r.co) },
      delivery: { score: clampScore(r.d), wordsPerMinute: wpm },
    },
    annotations,
    correctedVersion: reconstructCorrected(transcript, annotations),
    strengths: asStrArr(r.str),
    improvements: asStrArr(r.imp),
    sampleAnswer: asStr(r.sa).trim(),
    transcript,
    charCount,
    overallFeedback: asStr(r.fb),
  };
}

const READING_EXPLAIN_SYSTEM = `You are a Vietnamese HSK Chinese reading teacher. For a reading-comprehension question, you explain (in Vietnamese) why the correct answer is correct and you point to the exact place in the passage that proves it. Return ONLY valid JSON.`;

/**
 * Sinh sẵn (tại lúc admin thêm câu hỏi) phần CHỮA BÀI cho một câu hỏi đọc hiểu:
 *  - `supportingQuote`: câu/cụm chữ Hán TRÍCH NGUYÊN VĂN từ đoạn văn chứng minh đáp án
 *    (để chỉ cho học viên đáp án lấy ở đâu).
 *  - `explanation`: giải thích chi tiết bằng tiếng Việt vì sao đáp án đúng.
 */
export async function generateReadingExplanation(params: {
  passage: string;
  prompt: string;
  correctAnswer: string;
  hskLevel?: string;
}): Promise<{ explanation: string; supportingQuote: string }> {
  const { passage, prompt, correctAnswer, hskLevel } = params;

  const parsed = await runGroqJson({
    models: GRADING_MODELS,
    system: READING_EXPLAIN_SYSTEM,
    maxTokens: 1024,
    temperature: 0.3,
    user: `Đoạn văn (Hán tự)${hskLevel ? ` — trình độ ${hskLevel}` : ""}:
${passage}

Câu hỏi: ${prompt}
Đáp án đúng: ${correctAnswer}

Trả về JSON đúng cấu trúc sau (không thêm gì ngoài JSON):
{
  "supportingQuote": "<TRÍCH NGUYÊN VĂN một câu hoặc cụm chữ Hán có trong đoạn văn, chứng minh đáp án>",
  "explanation": "<giải thích chi tiết bằng tiếng Việt vì sao đáp án đúng, có nhắc tới chỗ trích dẫn>"
}`,
  });
  const p = isRecord(parsed) ? parsed : {};
  return { explanation: asStr(p.explanation), supportingQuote: asStr(p.supportingQuote) };
}

const READING_QUESTIONS_SYSTEM = `You are a certified HSK (汉语水平考试) reading-comprehension examiner who writes exam questions for Vietnamese learners.

Your job: read ONE Chinese passage and write high-quality reading-comprehension questions answerable from the passage ALONE.

Rules:
- Calibrate difficulty to the stated HSK level (HSK1-2: simple facts, short options; HSK3-4: detail + simple inference; HSK5-6: main idea, nuance, implied meaning).
- Write every question prompt and all answer options in SIMPLIFIED CHINESE (简体字). Do NOT add pinyin.
- Mix question types: mostly MCQ (4 options), with some TRUE_FALSE and the occasional FILL_BLANK.
- MCQ: exactly ONE correct option; "answer" is its 0-based index; distractors must be plausible but clearly wrong per the passage.
- TRUE_FALSE: "answer" is a boolean clearly verifiable from the passage.
- FILL_BLANK: the prompt contains a blank "___"; "answer" is the exact Chinese string the passage supports.
- Every question MUST be answerable strictly from the passage — never invent facts that are not present.

ANSWER EVIDENCE — BOTH fields below are REQUIRED on every question (never omit them, never leave them empty):
- "supportingQuote": the EXACT sentence or phrase COPIED VERBATIM from the passage (Chinese, character-for-character) that contains or proves the answer. Do NOT paraphrase, translate, or invent — it must be findable in the passage word-for-word. Pick the shortest span that fully proves the answer.
- "explanation": a DETAILED explanation in natural Vietnamese (tiếng Việt) of WHY the answer is correct, explicitly pointing to where the evidence is in the passage (reference the content of supportingQuote). For MCQ, state why the correct option is right and, when useful, briefly why the most tempting distractor is wrong. 2-3 câu, cụ thể, không chung chung.

Output: Return ONLY one valid JSON object of the form { "questions": [ ... ] }. No markdown fences, no text before or after.`;

export interface GeneratedReadingQuestion {
  type: "MCQ" | "TRUE_FALSE" | "FILL_BLANK";
  prompt: string;
  /** Bản dịch tiếng Việt của câu hỏi (dùng cho phần chữa bài). */
  promptTranslation?: string;
  options?: string[];
  /** Bản dịch tiếng Việt của từng lựa chọn, cùng thứ tự với options. */
  optionsTranslation?: string[];
  answer: number | boolean | string;
  accepted?: string[];
  explanation?: string;
  supportingQuote?: string;
  /** Bản dịch tiếng Việt của câu trích dẫn (supportingQuote). */
  quoteTranslation?: string;
}

/** Chuẩn hoá 1 câu hỏi do AI sinh về đúng shape `GeneratedReadingQuestion`; trả null nếu không dùng được. */
function coerceGeneratedQuestion(raw: unknown): GeneratedReadingQuestion | null {
  if (!isRecord(raw)) return null;
  const prompt = asStr(raw.prompt).trim();
  if (!prompt) return null;
  const explanation = asOptStr(raw.explanation);
  const supportingQuote = asOptStr(raw.supportingQuote);
  const promptTranslation = asOptStr(raw.promptTranslation);
  const quoteTranslation = asOptStr(raw.quoteTranslation);

  if (raw.type === "MCQ") {
    // Ghép option ↔ bản dịch TRƯỚC khi lọc để giữ đúng thứ tự nếu có option rỗng.
    const rawOpts = Array.isArray(raw.options) ? raw.options : [];
    const rawTrans = Array.isArray(raw.optionsTranslation) ? raw.optionsTranslation : [];
    const pairs = rawOpts
      .map((o, i) => ({
        text: typeof o === "string" ? o.trim() : "",
        tr: typeof rawTrans[i] === "string" ? (rawTrans[i] as string).trim() : "",
      }))
      .filter((p) => p.text.length > 0);
    if (pairs.length < 2) return null;
    const options = pairs.map((p) => p.text);
    const optionsTranslation = pairs.some((p) => p.tr) ? pairs.map((p) => p.tr) : undefined;
    // Chấp nhận answer là chỉ số 0-based, hoặc (khi AI nhầm) là chính nội dung lựa chọn.
    const a = raw.answer;
    let idx: number;
    if (typeof a === "number") idx = a;
    else if (typeof a === "string") {
      const byText = options.indexOf(a.trim());
      idx = byText >= 0 ? byText : Number(a);
    } else idx = NaN;
    // Index không dùng được → bỏ câu (đừng âm thầm gán 0 = đáp án sai trông như đúng).
    if (!Number.isInteger(idx) || idx < 0 || idx >= options.length) return null;
    return { type: "MCQ", prompt, promptTranslation, options, optionsTranslation, answer: idx, explanation, supportingQuote, quoteTranslation };
  }
  if (raw.type === "TRUE_FALSE") {
    const a = raw.answer;
    let answer: boolean | null = null;
    if (typeof a === "boolean") answer = a;
    else if (typeof a === "number") answer = a === 1 ? true : a === 0 ? false : null;
    else if (typeof a === "string") {
      const s = a.trim().toLowerCase();
      if (["true", "1", "yes", "correct", "đúng", "对", "正确", "是"].includes(s)) answer = true;
      else if (["false", "0", "no", "incorrect", "sai", "错", "错误", "不是"].includes(s)) answer = false;
    }
    if (answer === null) return null; // bỏ câu mơ hồ thay vì đoán "false"
    return { type: "TRUE_FALSE", prompt, promptTranslation, answer, explanation, supportingQuote, quoteTranslation };
  }
  if (raw.type === "FILL_BLANK") {
    const answer = asStr(raw.answer).trim();
    if (!answer) return null;
    return { type: "FILL_BLANK", prompt, promptTranslation, answer, accepted: asStrArr(raw.accepted), explanation, supportingQuote, quoteTranslation };
  }
  return null;
}

/**
 * Cho admin: từ một đoạn văn, nhờ Groq soạn sẵn `count` câu hỏi đọc hiểu (MCQ /
 * Đúng-Sai / điền chỗ trống) kèm đáp án + giải thích + trích dẫn. Kết quả được
 * admin DUYỆT trong ô JSON trước khi lưu, nên hàm chỉ trả về mảng đã chuẩn hoá.
 */
export async function generateReadingQuestions(params: {
  passage: string;
  hskLevel: string;
  count: number;
}): Promise<GeneratedReadingQuestion[]> {
  const { passage, hskLevel, count } = params;
  const n = Math.max(1, Math.min(20, Math.round(count) || 5));

  // Mọi model hỏng → trả mảng rỗng thay vì văng lỗi (admin sẽ bấm tạo lại).
  let parsed: unknown = null;
  try {
    parsed = await runGroqJson({
      models: GRADING_MODELS,
      system: READING_QUESTIONS_SYSTEM,
      // Mỗi câu (Hán tự + 4 lựa chọn + giải thích + trích dẫn) khá tốn token; với
      // count tới 20 dễ vượt 4096 → JSON bị cắt cụt. Nâng trần như chấm viết.
      maxTokens: 8192,
      temperature: 0.3,
      user: `Soạn ${n} câu hỏi đọc hiểu cho đoạn văn sau (trình độ ${hskLevel}).

=== ĐOẠN VĂN (Hán tự) ===
${passage}

=== YÊU CẦU ===
Mỗi câu BẮT BUỘC có "explanation" (giải thích CHI TIẾT bằng tiếng Việt vì sao đáp án đúng, chỉ rõ dựa vào câu nào trong đoạn) và "supportingQuote" (TRÍCH NGUYÊN VĂN câu/cụm trong đoạn chứa đáp án — không được để trống).
Trả về DUY NHẤT một JSON object đúng cấu trúc:
{
  "questions": [
    { "type": "MCQ", "prompt": "<Hán>", "options": ["<Hán>","<Hán>","<Hán>","<Hán>"], "answer": <chỉ số 0-based>, "explanation": "<giải thích chi tiết, tiếng Việt: vì sao đúng + dựa vào đâu>", "supportingQuote": "<trích NGUYÊN VĂN câu trong đoạn chứa đáp án>" },
    { "type": "TRUE_FALSE", "prompt": "<Hán>", "answer": <true|false>, "explanation": "<giải thích chi tiết, tiếng Việt>", "supportingQuote": "<trích NGUYÊN VĂN>" },
    { "type": "FILL_BLANK", "prompt": "<Hán có chỗ trống ___>", "answer": "<Hán>", "accepted": ["<đáp án thay thế nếu có>"], "explanation": "<giải thích chi tiết, tiếng Việt>", "supportingQuote": "<trích NGUYÊN VĂN>" }
  ]
}`,
    });
  } catch {
    parsed = null;
  }
  const arr = isRecord(parsed) && Array.isArray(parsed.questions) ? parsed.questions : [];
  return arr
    .map(coerceGeneratedQuestion)
    .filter((q): q is GeneratedReadingQuestion => q !== null);
}

const LISTENING_QUESTIONS_SYSTEM = `You are a certified HSK (汉语水平考试) listening-comprehension examiner who writes exam questions for Vietnamese learners.

Your job: read ONE Chinese listening tapescript (lời thoại — it may be a dialogue with speaker labels like A:/B:/男:/女:) and write high-quality listening-comprehension questions answerable from the tapescript ALONE.

Rules:
- Calibrate difficulty to the stated HSK level (HSK1-2: simple facts, who/what/where; HSK3-4: detail + simple inference; HSK5-6: main idea, speaker attitude, implied meaning).
- Write every question prompt and all answer options in SIMPLIFIED CHINESE (简体字). Do NOT add pinyin.
- Mix question types: mostly MCQ (4 options), with some TRUE_FALSE. Use FILL_BLANK only when a number/name/word is explicitly spoken.
- MCQ: exactly ONE correct option; "answer" is its 0-based index; distractors must be plausible but clearly wrong per the tapescript.
- TRUE_FALSE: "answer" is a boolean clearly verifiable from the tapescript.
- Every question MUST be answerable strictly from the tapescript — never invent facts that are not present.

ANSWER EVIDENCE — these fields are REQUIRED on every question (never omit them, never leave them empty):
- "supportingQuote": the EXACT sentence or phrase COPIED VERBATIM from the tapescript (Chinese, character-for-character) that contains or proves the answer. Do NOT paraphrase or invent — it must be findable in the tapescript word-for-word. Pick the shortest span that fully proves the answer.
- "explanation": a DETAILED explanation in natural Vietnamese (tiếng Việt) of WHY the answer is correct, explicitly pointing to where the evidence is in the tapescript. For MCQ, state why the correct option is right and, when useful, briefly why the most tempting distractor is wrong. 2-3 câu, cụ thể, không chung chung.

VIETNAMESE TRANSLATIONS — also REQUIRED on every question so the learner can study the review:
- "promptTranslation": natural Vietnamese translation of the question prompt.
- "optionsTranslation" (MCQ only): an array translating EACH option into Vietnamese, in the SAME order and SAME length as "options".
- "quoteTranslation": natural Vietnamese translation of "supportingQuote".
Translations must be natural Vietnamese (not word-by-word), accurate to the Chinese.

Output: Return ONLY one valid JSON object of the form { "questions": [ ... ] }. No markdown fences, no text before or after.`;

/**
 * Cho admin: từ LỜI THOẠI của bài nghe, nhờ Groq soạn sẵn `count` câu hỏi nghe
 * hiểu (MCQ / Đúng-Sai, đôi khi điền chỗ trống) kèm đáp án + giải thích + trích
 * dẫn. Kết quả được admin DUYỆT trong ô JSON trước khi lưu. Dùng chung shape
 * `GeneratedReadingQuestion` với phần đọc hiểu (cấu trúc câu hỏi giống nhau).
 */
export async function generateListeningQuestions(params: {
  transcript: string;
  hskLevel: string;
  count: number;
}): Promise<GeneratedReadingQuestion[]> {
  const { transcript, hskLevel, count } = params;
  const n = Math.max(1, Math.min(20, Math.round(count) || 5));

  // Mọi model hỏng → trả mảng rỗng thay vì văng lỗi (admin sẽ bấm tạo lại).
  let parsed: unknown = null;
  try {
    parsed = await runGroqJson({
      models: GRADING_MODELS,
      system: LISTENING_QUESTIONS_SYSTEM,
      // Câu hỏi NGHE nặng token hơn ĐỌC (mỗi câu thêm promptTranslation +
      // optionsTranslation×4 + quoteTranslation ≈ gấp đôi). Trần cố định 8192 dễ
      // bị cắt cụt khi count lớn → JSON hỏng → trả [] âm thầm. Co giãn theo n.
      maxTokens: Math.min(16000, 2200 + n * 800),
      temperature: 0.3,
      user: `Soạn ${n} câu hỏi nghe hiểu cho lời thoại sau (trình độ ${hskLevel}).

=== LỜI THOẠI (Hán tự) ===
${transcript}

=== YÊU CẦU ===
Mỗi câu BẮT BUỘC có đủ: "explanation" (giải thích CHI TIẾT tiếng Việt), "supportingQuote" (TRÍCH NGUYÊN VĂN trong lời thoại — không để trống), "promptTranslation" (dịch câu hỏi sang tiếng Việt), "quoteTranslation" (dịch câu trích dẫn). Riêng MCQ thêm "optionsTranslation" (mảng dịch TỪNG lựa chọn, cùng thứ tự & độ dài với options).
Trả về DUY NHẤT một JSON object đúng cấu trúc:
{
  "questions": [
    { "type": "MCQ", "prompt": "<Hán>", "promptTranslation": "<dịch câu hỏi, tiếng Việt>", "options": ["<Hán>","<Hán>","<Hán>","<Hán>"], "optionsTranslation": ["<dịch>","<dịch>","<dịch>","<dịch>"], "answer": <chỉ số 0-based>, "explanation": "<giải thích chi tiết, tiếng Việt>", "supportingQuote": "<trích NGUYÊN VĂN>", "quoteTranslation": "<dịch câu trích, tiếng Việt>" },
    { "type": "TRUE_FALSE", "prompt": "<Hán>", "promptTranslation": "<dịch câu hỏi>", "answer": <true|false>, "explanation": "<giải thích chi tiết, tiếng Việt>", "supportingQuote": "<trích NGUYÊN VĂN>", "quoteTranslation": "<dịch câu trích>" }
  ]
}`,
    });
  } catch {
    parsed = null;
  }
  const arr = isRecord(parsed) && Array.isArray(parsed.questions) ? parsed.questions : [];
  return arr
    .map(coerceGeneratedQuestion)
    .filter((q): q is GeneratedReadingQuestion => q !== null);
}

const TRANSCRIPT_EXPLAIN_SYSTEM = `You are a Chinese-listening teacher for Vietnamese HSK learners. Given ONE Chinese listening tapescript (lời thoại, possibly a dialogue with speaker labels like A:/B:/男:/女:), produce a clear, exam-style explanation IN VIETNAMESE so the learner fully understands what they heard.

Rules:
- "translation": dịch TOÀN BỘ lời thoại sang tiếng Việt TỰ NHIÊN, theo từng lượt thoại/câu, giữ nhãn người nói (A:/B:/男:/女:) ở đầu dòng nếu có. Mỗi câu/lượt một dòng. KHÔNG chèn chữ Hán, KHÔNG phiên âm — chỉ tiếng Việt.
- "summary": 1-2 câu tiếng Việt tóm tắt nội dung/tình huống chính của đoạn nghe.
- "vocab": liệt kê 4-10 từ/cụm QUAN TRỌNG hoặc KHÓ trong lời thoại; mỗi mục { "zh": "<chữ Hán>", "pinyin": "<pinyin có dấu thanh>", "vi": "<nghĩa tiếng Việt>" }. Chọn từ thực sự đáng học ở trình độ đề.

Output: Return ONLY one valid JSON object. No markdown fences, no text before or after.`;

export interface TranscriptExplanation {
  translation: string;
  summary: string;
  vocab: Array<{ zh: string; pinyin: string; vi: string }>;
}

/**
 * Cho admin: dịch + giải thích toàn bộ lời thoại của bài nghe (tiếng Việt) để
 * lưu vào ListeningTest.transcriptExplanation và hiện ở phần chữa bài. Trả về
 * shape đã chuẩn hoá (không tin shape thô từ AI).
 */
export async function generateTranscriptExplanation(params: {
  transcript: string;
  hskLevel: string;
}): Promise<TranscriptExplanation> {
  const { transcript, hskLevel } = params;

  const parsed = await runGroqJson({
    models: GRADING_MODELS,
    system: TRANSCRIPT_EXPLAIN_SYSTEM,
    maxTokens: 4096,
    temperature: 0.2,
    user: `Dịch & giải thích lời thoại bài nghe sau (trình độ ${hskLevel}).

=== LỜI THOẠI (Hán tự) ===
${transcript}

=== YÊU CẦU ===
Trả về DUY NHẤT một JSON object đúng cấu trúc:
{
  "translation": "<dịch toàn bộ lời thoại sang tiếng Việt, mỗi câu/lượt một dòng>",
  "summary": "<1-2 câu tóm tắt tiếng Việt>",
  "vocab": [ { "zh": "<Hán>", "pinyin": "<pinyin>", "vi": "<nghĩa tiếng Việt>" } ]
}`,
  });

  const r = isRecord(parsed) ? parsed : {};
  const vocab = (Array.isArray(r.vocab) ? r.vocab : [])
    .filter(isRecord)
    .map((v) => ({ zh: asStr(v.zh).trim(), pinyin: asStr(v.pinyin).trim(), vi: asStr(v.vi).trim() }))
    .filter((v) => v.zh && v.vi);
  return {
    translation: asStr(r.translation).trim(),
    summary: asStr(r.summary).trim(),
    vocab,
  };
}

export interface WritingGradeResult {
  score: number;
  /** Nhãn ngắn gọn tiếng Việt, vd "Tốt – đạt chuẩn HSK4". Optional (tương thích bài chấm cũ). */
  bandLabel?: string;
  criteria: {
    /** Mức độ bám sát đề + dàn ý + đủ số chữ. Optional vì bài chấm cũ chưa có. */
    taskResponse?: { score: number; feedback: string };
    grammar: { score: number; feedback: string; errors: string[] };
    vocabulary: { score: number; feedback: string; suggestions: string[] };
    coherence: { score: number; feedback: string };
  };
  annotations: Array<{
    original: string;
    /** Loại lỗi (语法|词汇|语序|量词|虚词|搭配|标点|错别字). Optional. */
    type?: string;
    issue: string;
    correction: string;
    explanation: string;
  }>;
  /** Điểm mạnh của bài viết. Optional. */
  strengths?: string[];
  /** Gợi ý cải thiện cụ thể. Optional. */
  improvements?: string[];
  correctedVersion: string;
  overallFeedback: string;
}

export interface SpeakingGradeResult {
  score: number;
  criteria: {
    pronunciation: { score: number; errors: Array<{ word: string; issue: string; correct: string }> };
    tones: { score: number; errors: Array<{ word: string; expected: string; detected: string }> };
    fluency: { score: number; wordsPerMinute: number; feedback: string };
  };
  transcript: string;
  overallFeedback: string;
}
