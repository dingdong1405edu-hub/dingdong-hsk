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

const WRITING_SYSTEM = `You are a certified HSK Chinese language examiner with expertise in teaching Vietnamese learners. You evaluate Chinese writing submissions with strict rubric scoring. Return ONLY valid JSON, no explanation outside the JSON structure.`;

const SPEAKING_SYSTEM = `You are a HSKK (Hanyu Shuiping Kouyu Kaoshi) examiner. You evaluate spoken Chinese by Vietnamese learners. Note: Vietnamese is a tonal language but tones differ significantly from Mandarin. Return ONLY valid JSON.`;

export async function gradeWriting(params: {
  submission: string;
  hskLevel: string;
  taskPrompt: string;
  minChars: number;
}): Promise<WritingGradeResult> {
  const { submission, hskLevel, taskPrompt, minChars } = params;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 2048,
    temperature: 0.3,
    messages: [
      { role: "system", content: WRITING_SYSTEM },
      {
        role: "user",
        content: `Evaluate this Chinese writing submission by a Vietnamese learner at ${hskLevel} level.

Task: ${taskPrompt}
Minimum characters required: ${minChars}
Submission: ${submission}

Return JSON with this exact structure:
{
  "score": <0-100>,
  "criteria": {
    "grammar": { "score": <0-100>, "feedback": "<Vietnamese feedback>", "errors": ["<error1>"] },
    "vocabulary": { "score": <0-100>, "feedback": "<Vietnamese feedback>", "suggestions": ["<suggestion1>"] },
    "coherence": { "score": <0-100>, "feedback": "<Vietnamese feedback>" }
  },
  "annotations": [
    { "original": "<错误片段>", "issue": "<Vietnamese explanation>", "correction": "<corrected>", "explanation": "<Vietnamese detail>" }
  ],
  "correctedVersion": "<full corrected text>",
  "overallFeedback": "<Vietnamese overall feedback>"
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
  criteria: {
    grammar: { score: number; feedback: string; errors: string[] };
    vocabulary: { score: number; feedback: string; suggestions: string[] };
    coherence: { score: number; feedback: string };
  };
  annotations: Array<{
    original: string;
    issue: string;
    correction: string;
    explanation: string;
  }>;
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
