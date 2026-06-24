// Text-to-speech for Mandarin Chinese via **Google Cloud Text-to-Speech**.
// Google has high-quality Mandarin (cmn-CN) voices — Deepgram and Groq offer NO
// Chinese TTS voice at all, which is why listening-audio generation uses Google
// here. We call the REST endpoint with a simple API key (no SDK, no
// service-account JSON) to keep the dependency surface minimal. The key is
// checked lazily so a missing key never breaks `next build` or a module import.

import { splitTranscript } from "@/lib/transcript";

const GOOGLE_TTS_ENDPOINT = "https://texttospeech.googleapis.com/v1/text:synthesize";
// Mandarin Simplified. cmn-CN-Wavenet-A is a natural female voice available on
// every project; override via env (e.g. cmn-CN-Wavenet-B/C male, or a Neural2 /
// Chirp3-HD voice) without a code change.
const GOOGLE_TTS_LANGUAGE = process.env.GOOGLE_TTS_LANGUAGE || "cmn-CN";
const GOOGLE_TTS_VOICE = process.env.GOOGLE_TTS_VOICE || "cmn-CN-Wavenet-A";

export function isTtsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_TTS_API_KEY);
}

interface GoogleTtsResponse {
  audioContent?: string; // base64-encoded MP3
  error?: { message?: string };
}

/**
 * Strip leading speaker labels ("A:", "B:", "男:", "女:") so the synthesizer
 * reads the dialogue naturally instead of spelling out the label. Segments are
 * rejoined with newlines, which Google renders as a natural pause between turns.
 */
function cleanForSpeech(transcript: string): string {
  const segments = splitTranscript(transcript);
  if (segments.length === 0) return transcript.trim();
  return segments.map((s) => s.text).join("\n");
}

/**
 * Synthesize Mandarin speech from text. Returns the MP3 bytes so the caller can
 * persist them. Throws a descriptive Error on any failure (missing key, API
 * error, empty response) — never returns a partial/empty buffer silently.
 */
export async function synthesizeSpeech(
  text: string,
  opts: { voiceName?: string; languageCode?: string; speakingRate?: number } = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY_MISSING");

  const input = cleanForSpeech(text);
  if (!input) throw new Error("Văn bản trống — không có gì để đọc.");
  // Google caps a single synthesize request at 5000 bytes of input. UTF-8 Hán
  // tự are 3 bytes each → ~1600 chữ. Guard with a clear message; longer
  // transcripts should be split by the caller.
  if (Buffer.byteLength(input, "utf8") > 4800) {
    throw new Error("Transcript quá dài cho một lần tạo (giới hạn ~1600 chữ Hán). Hãy chia nhỏ rồi tạo lại.");
  }

  const body = {
    input: { text: input },
    voice: {
      languageCode: opts.languageCode || GOOGLE_TTS_LANGUAGE,
      name: opts.voiceName || GOOGLE_TTS_VOICE,
    },
    audioConfig: { audioEncoding: "MP3", speakingRate: opts.speakingRate ?? 1.0 },
  };

  const res = await fetch(`${GOOGLE_TTS_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as GoogleTtsResponse;
  if (!res.ok || !data.audioContent) {
    const msg = data.error?.message || `HTTP ${res.status}`;
    throw new Error(`Google TTS error: ${msg.slice(0, 300)}`);
  }

  return { buffer: Buffer.from(data.audioContent, "base64"), contentType: "audio/mpeg" };
}
