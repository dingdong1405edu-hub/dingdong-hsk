// Speech-to-text for Mandarin Chinese via **Deepgram Nova-3**.
// Deepgram has best-in-class Chinese (Mandarin Simplified) transcription — we
// call the prerecorded REST endpoint directly over fetch (no SDK) to keep the
// dependency surface minimal. The key is checked lazily so a missing key never
// breaks `next build` or a module import — callers fail gracefully with a clear
// error instead.
//
// NOTE: Deepgram does NOT offer Mandarin text-to-speech (Aura-2 covers only
// EN/ES/DE/FR/NL/IT/JA), so generating listening audio lives in
// src/lib/google-tts.ts. Deepgram here is audio → text ONLY.

const DEEPGRAM_ENDPOINT = "https://api.deepgram.com/v1/listen";
// Nova-3 added Mandarin Simplified with a large WER improvement over Nova-2.
const DEEPGRAM_MODEL = process.env.DEEPGRAM_STT_MODEL || "nova-3";
// Mandarin Simplified. Override via env for Traditional (zh-TW) / Cantonese (zh-HK).
const DEEPGRAM_LANGUAGE = process.env.DEEPGRAM_STT_LANGUAGE || "zh-CN";

export function isDeepgramConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

interface DeepgramResponse {
  results?: {
    channels?: Array<{
      alternatives?: Array<{ transcript?: string }>;
    }>;
  };
}

/**
 * Transcribe an audio buffer to Mandarin text. Sends the raw bytes with the
 * source Content-Type — Deepgram sniffs the container itself. Returns "" when no
 * speech was detected (a valid result, not an error). Throws a descriptive Error
 * on a missing key or an API failure so the caller (src/lib/stt.ts) can decide
 * whether to fall back to Groq Whisper.
 */
export async function transcribeWithDeepgram(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY_MISSING");

  const params = new URLSearchParams({
    model: DEEPGRAM_MODEL,
    language: DEEPGRAM_LANGUAGE,
    smart_format: "true",
    punctuate: "true",
  });

  const res = await fetch(`${DEEPGRAM_ENDPOINT}?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": mimeType || "audio/webm",
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Deepgram error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as DeepgramResponse;
  return data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
}
