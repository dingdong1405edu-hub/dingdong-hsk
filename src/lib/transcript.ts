// Pure helpers for the Listening module: split a transcript ("tapescript") into
// speaker-tagged sentence segments, and locate which segment an answer comes
// from (powering the "lấy ở đoạn nào" review). No DOM/Node APIs — safe to run on
// the server (seed/util) and in the client.

export interface TranscriptSegment {
  /** Speaker label if the line was prefixed (e.g. "A", "B", "男", "女"); else null. */
  speaker: string | null;
  /** The spoken text of this segment (speaker prefix stripped). */
  text: string;
  /** 0-based index of the source line this segment came from. */
  line: number;
}

// A leading single-letter / 男 / 女 label followed by a colon marks a speaker.
// Deliberately narrow so a normal sentence that merely contains a colon is not
// misread as a speaker turn.
const SPEAKER_RE = /^\s*([A-Za-z]|男|女)\s*[:：]\s*/;
const SENTENCE_ENDERS = "。！？!?；;…";

/** Split into sentences, keeping each ender attached. Avoids regex lookbehind
 *  so it works on older embedded webviews. */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (SENTENCE_ENDERS.includes(ch)) {
      const t = buf.trim();
      if (t) out.push(t);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

export function splitTranscript(transcript: string | null | undefined): TranscriptSegment[] {
  if (!transcript) return [];
  const segments: TranscriptSegment[] = [];
  const lines = transcript.split(/\r?\n/);
  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.trim();
    if (!line) return;
    let speaker: string | null = null;
    let content = line;
    const m = line.match(SPEAKER_RE);
    if (m) {
      speaker = m[1];
      content = line.slice(m[0].length).trim();
    }
    if (!content) return;
    const parts = splitSentences(content);
    for (const part of parts.length ? parts : [content]) {
      segments.push({ speaker, text: part, line: lineIdx });
    }
  });
  return segments;
}

function hanChars(s: string): string[] {
  return s.match(/\p{Script=Han}/gu) ?? [];
}

export interface EvidenceQuestion {
  type: string;
  prompt: string;
  options?: unknown;
  correctAnswer: unknown;
}

/**
 * Best-guess index of the transcript segment that justifies the correct answer.
 * Heuristic: the exact correct-option text is the strongest signal, then shared
 * Han characters with the answer, then with the prompt. Returns -1 when no
 * segment clears a small confidence threshold (so we never highlight at random).
 */
export function findEvidenceIndex(segments: TranscriptSegment[], q: EvidenceQuestion): number {
  if (!segments.length) return -1;

  const ca = (q.correctAnswer ?? {}) as { index?: number; value?: boolean; text?: string };
  const opts = Array.isArray(q.options) ? (q.options as Array<{ text?: string }>) : [];
  let answerText = typeof ca.text === "string" ? ca.text : "";
  if (!answerText && typeof ca.index === "number") {
    answerText = opts[ca.index]?.text ?? "";
  }

  const answerChars = answerText ? hanChars(answerText) : [];
  const promptChars = hanChars(q.prompt);

  let best = -1;
  let bestScore = 0;
  segments.forEach((seg, i) => {
    let score = 0;
    if (answerText && seg.text.includes(answerText)) score += 50 + answerText.length * 5;
    for (const c of answerChars) if (seg.text.includes(c)) score += 3;
    for (const c of promptChars) if (seg.text.includes(c)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });

  return bestScore >= 4 ? best : -1;
}
