// Speech-to-text for HSKK speaking via Mistral's **Voxtral** model.
// We call the Mistral transcription API directly over fetch (no SDK) to keep the
// dependency surface minimal. Config is checked lazily (see src/lib/groq.ts) so a
// missing key never breaks `next build` or module import — the transcribe
// endpoint instead fails gracefully with a clear error when unconfigured.

const VOXTRAL_ENDPOINT = "https://api.mistral.ai/v1/audio/transcriptions";
// Mandarin STT. `voxtral-mini-latest` is the lightweight transcription model;
// switch to `voxtral-small-latest` for higher accuracy at higher cost.
const VOXTRAL_MODEL = "voxtral-mini-latest";

// Text-to-speech (Voxtral TTS, released 2026-03). The speech endpoint takes a
// JSON body and returns the audio either as base64 (`audio_data`) or as a raw
// binary stream — we handle both. Model + voice are overridable via env so the
// owner can tune without a code change.
//
// NOTE on Chinese: Mistral officially lists 9 TTS languages and Mandarin is NOT
// among them, so generated audio for 简体字 is best-effort. The learner player
// therefore always falls back to the browser Web Speech engine (zh-CN) when a
// test has no usable MP3 — generation here is a convenience, not a hard
// dependency. See src/components/learn/listening/audio-player.tsx.
const VOXTRAL_SPEECH_ENDPOINT = "https://api.mistral.ai/v1/audio/speech";
const VOXTRAL_TTS_MODEL = process.env.VOXTRAL_TTS_MODEL || "voxtral-mini-tts-2603";
// Optional preset/custom voice id. If unset we let the API pick its default —
// if the API rejects the request for a missing voice, the error text is
// surfaced to the admin so they can set VOXTRAL_TTS_VOICE.
const VOXTRAL_TTS_VOICE = process.env.VOXTRAL_TTS_VOICE || "";

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.VOXTRAL_API_KEY);
}

/** TTS shares the same Mistral key as STT. */
export function isTtsConfigured(): boolean {
  return Boolean(process.env.VOXTRAL_API_KEY);
}

interface VoxtralTranscription {
  text?: string;
  language?: string | null;
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = process.env.VOXTRAL_API_KEY;
  if (!apiKey) throw new Error("VOXTRAL_API_KEY_MISSING");

  const form = new FormData();
  // Wrap in a plain Uint8Array view so the Blob part type is exact across
  // @types/node versions (Buffer<ArrayBufferLike> isn't assignable to BlobPart).
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || "audio/webm" });
  form.append("file", blob, "audio.webm");
  form.append("model", VOXTRAL_MODEL);
  form.append("language", "zh"); // Mandarin (ISO 639-1)

  const res = await fetch(VOXTRAL_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voxtral error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as VoxtralTranscription;
  return data.text ?? "";
}

interface VoxtralSpeechResponse {
  audio_data?: string; // base64
  audio?: string;
  data?: string;
}

/**
 * Generate spoken audio from text via Voxtral TTS. Returns the raw audio bytes
 * (MP3 by default) so the caller can persist them. Throws a descriptive Error
 * on any failure (missing key, API error, empty response) — never returns a
 * partial/empty buffer silently.
 */
export async function synthesizeSpeech(
  text: string,
  opts: { format?: "mp3" | "wav"; voiceId?: string } = {},
): Promise<{ buffer: Buffer; contentType: string }> {
  const apiKey = process.env.VOXTRAL_API_KEY;
  if (!apiKey) throw new Error("VOXTRAL_API_KEY_MISSING");

  const input = text.trim();
  if (!input) throw new Error("Văn bản trống — không có gì để đọc.");
  // Keep a sane cap; very long transcripts should be chunked by the caller.
  if (input.length > 6000) throw new Error("Transcript quá dài (tối đa 6000 ký tự cho một lần tạo).");

  const format = opts.format ?? "mp3";
  const voiceId = opts.voiceId || VOXTRAL_TTS_VOICE;

  const body: Record<string, unknown> = {
    model: VOXTRAL_TTS_MODEL,
    input,
    response_format: format,
    stream: false,
  };
  if (voiceId) body.voice_id = voiceId;

  const res = await fetch(VOXTRAL_SPEECH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voxtral TTS error ${res.status}: ${detail.slice(0, 400)}`);
  }

  const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";
  const ct = res.headers.get("content-type") ?? "";

  // Path A: JSON body carrying base64 audio.
  if (ct.includes("application/json")) {
    const data = (await res.json()) as VoxtralSpeechResponse;
    const b64 = data.audio_data ?? data.audio ?? data.data;
    if (!b64) throw new Error("Voxtral TTS không trả về dữ liệu âm thanh.");
    return { buffer: Buffer.from(b64, "base64"), contentType };
  }

  // Path B: raw binary audio stream.
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) throw new Error("Voxtral TTS trả về âm thanh rỗng.");
  return { buffer, contentType };
}
