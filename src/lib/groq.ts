import Groq from "groq-sdk";

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

const WRITING_SYSTEM = `You are a certified HSK (汉语水平考试) writing examiner with 15+ years grading Chinese compositions, and a specialist in teaching Vietnamese learners.

Your job: grade ONE Chinese writing submission strictly, accurately and in fine detail, then write all feedback in natural Vietnamese (tiếng Việt) so a Vietnamese learner understands it.

Grading discipline:
- Calibrate to the stated HSK level: HSK1-2 expect short, simple, mostly correct sentences; HSK3-4 expect connected paragraphs with basic connectives (因为/所以, 虽然/但是, 然后); HSK5-6 expect rich vocabulary, complex structures, idioms/成语 and clear argument. Do NOT punish an HSK2 writer for lacking HSK6 sophistication, and do NOT over-reward an HSK6 writer for merely-correct basic sentences.
- Score bands (apply to overall and each criterion): 90-100 = xuất sắc, gần như không lỗi; 75-89 = tốt, vài lỗi nhỏ; 60-74 = đạt, nhiều lỗi nhưng vẫn hiểu được; 40-59 = yếu, lỗi cản trở việc hiểu; 0-39 = chưa đạt / lạc đề / quá ngắn.
- Be exhaustive about errors. Inspect for: 语法 (sai ngữ pháp, thiếu/thừa thành phần câu), 词汇 (dùng sai từ, sai sắc thái, từ không tồn tại), 语序 (trật tự từ sai), 量词 (dùng sai/thiếu lượng từ), 虚词 (dùng sai 了/着/过/的/地/得/把/被), 搭配 (kết hợp từ sai - collocation), 标点 (dấu câu sai, dùng dấu Latin thay vì dấu Trung 。，、？！), 错别字 (viết sai chữ Hán / dùng nhầm chữ đồng âm), and 重复/啰嗦 (lặp ý, dài dòng).
- Vietnamese-learner pitfalls to actively check: thiếu lượng từ (一个人 not 一人), sai vị trí trạng ngữ thời gian/nơi chốn, lạm dụng/thiếu 了, dịch word-by-word từ tiếng Việt, dùng dấu câu Latin.
- Every annotation MUST quote the learner's ACTUAL text verbatim in "original" — never invent or paraphrase an error that is not in the submission. If the writing has no real errors, return an empty annotations array.
- "correctedVersion" must rewrite the WHOLE submission into natural, level-appropriate Chinese while preserving the learner's original meaning and ideas — do not add new content they did not write.
- Also judge whether the writing addresses the task prompt, covers the suggested outline points (if an outline is given), and meets the minimum character requirement; reflect this in the taskResponse criterion and lower the overall score if it is off-topic or too short.

Output: Return ONLY one valid JSON object, no markdown fences, no text before or after.`;

const SPEAKING_SYSTEM = `You are a HSKK (Hanyu Shuiping Kouyu Kaoshi) examiner. You evaluate spoken Chinese by Vietnamese learners. Note: Vietnamese is a tonal language but tones differ significantly from Mandarin. Return ONLY valid JSON.`;

export async function gradeWriting(params: {
  submission: string;
  hskLevel: string;
  taskPrompt: string;
  minChars: number;
  outline?: string | null;
}): Promise<WritingGradeResult> {
  const { submission, hskLevel, taskPrompt, minChars, outline } = params;

  const outlineBlock = outline?.trim()
    ? `Suggested outline the learner was asked to follow (đối chiếu xem bài viết có bám sát các ý này không):
${outline.trim()}`
    : `No suggested outline was provided for this task.`;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WRITING_SYSTEM },
      {
        role: "user",
        content: `Grade this Chinese writing submission by a Vietnamese learner at ${hskLevel} level.

=== TASK PROMPT ===
${taskPrompt}

=== ${outlineBlock.startsWith("No suggested") ? "OUTLINE" : "SUGGESTED OUTLINE"} ===
${outlineBlock}

=== REQUIREMENTS ===
Minimum Chinese characters required: ${minChars}

=== LEARNER SUBMISSION ===
${submission}

=== INSTRUCTIONS ===
Grade strictly and in detail per your rubric. Find EVERY meaningful error (quote the learner's real text in "original"). Write all feedback fields in Vietnamese. Return ONLY a JSON object with EXACTLY this structure:
{
  "score": <0-100, overall>,
  "bandLabel": "<nhãn ngắn gọn bằng tiếng Việt, ví dụ 'Tốt – đạt chuẩn ${hskLevel}'>",
  "criteria": {
    "taskResponse": { "score": <0-100>, "feedback": "<tiếng Việt: có bám sát đề + dàn ý không, đủ số chữ không, có lạc đề không>" },
    "grammar": { "score": <0-100>, "feedback": "<tiếng Việt>", "errors": ["<tóm tắt từng lỗi ngữ pháp bằng tiếng Việt>"] },
    "vocabulary": { "score": <0-100>, "feedback": "<tiếng Việt>", "suggestions": ["<gợi ý từ/cách dùng hay hơn>"] },
    "coherence": { "score": <0-100>, "feedback": "<tiếng Việt: bố cục, liên kết câu, mạch lạc>" }
  },
  "annotations": [
    { "original": "<TRÍCH NGUYÊN VĂN đoạn sai trong bài>", "type": "<loại lỗi: 语法|词汇|语序|量词|虚词|搭配|标点|错别字>", "issue": "<lỗi là gì, tiếng Việt>", "correction": "<bản sửa đúng bằng chữ Hán>", "explanation": "<giải thích chi tiết bằng tiếng Việt, nói rõ vì sao sai và quy tắc đúng>" }
  ],
  "strengths": ["<điểm mạnh cụ thể của bài viết, tiếng Việt>"],
  "improvements": ["<gợi ý cải thiện cụ thể, có thể hành động, tiếng Việt>"],
  "correctedVersion": "<toàn bộ bài viết đã được sửa thành tiếng Trung tự nhiên, giữ nguyên ý của học viên>",
  "overallFeedback": "<nhận xét tổng thể bằng tiếng Việt, 2-4 câu>"
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response");

  return JSON.parse(jsonMatch[0]) as WritingGradeResult;
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

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1536,
    temperature: 0.3,
    messages: [
      { role: "system", content: SPEAKING_SYSTEM },
      {
        role: "user",
        content: `Evaluate this HSKK speaking submission at ${hskLevel} level.
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
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response");

  return JSON.parse(jsonMatch[0]) as SpeakingGradeResult;
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

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [
      { role: "system", content: READING_EXPLAIN_SYSTEM },
      {
        role: "user",
        content: `Đoạn văn (Hán tự)${hskLevel ? ` — trình độ ${hskLevel}` : ""}:
${passage}

Câu hỏi: ${prompt}
Đáp án đúng: ${correctAnswer}

Trả về JSON đúng cấu trúc sau (không thêm gì ngoài JSON):
{
  "supportingQuote": "<TRÍCH NGUYÊN VĂN một câu hoặc cụm chữ Hán có trong đoạn văn, chứng minh đáp án>",
  "explanation": "<giải thích chi tiết bằng tiếng Việt vì sao đáp án đúng, có nhắc tới chỗ trích dẫn>"
}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid AI response");
  const parsed = JSON.parse(jsonMatch[0]) as { explanation?: string; supportingQuote?: string };
  return {
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : "",
    supportingQuote: typeof parsed.supportingQuote === "string" ? parsed.supportingQuote : "",
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
