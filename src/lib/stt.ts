// Unified speech-to-text: **Deepgram Nova-3** (primary, best Mandarin) with a
// **Groq Whisper** fallback so transcription keeps working if Deepgram is down
// or its key is missing. Public surface: transcribeAudio +
// isTranscriptionConfigured — the single STT entry point for the whole app
// (/api/transcribe and the admin "Tạo transcript từ audio" action).

import { isDeepgramConfigured, transcribeWithDeepgram } from "@/lib/deepgram";
import { isGradingConfigured as isGroqConfigured, transcribeWithGroq } from "@/lib/groq";

export function isTranscriptionConfigured(): boolean {
  return isDeepgramConfigured() || isGroqConfigured();
}

/**
 * Transcribe Mandarin audio to text. Tries Deepgram first; on an API error (not
 * an empty result) falls back to Groq Whisper when that key is present. Returns
 * "" when no speech was detected. Throws only when no provider is configured or
 * the last available provider fails.
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  if (isDeepgramConfigured()) {
    try {
      return await transcribeWithDeepgram(audioBuffer, mimeType);
    } catch (e) {
      // Only fall back if Groq is actually available; otherwise surface the real
      // Deepgram error so the caller can show a meaningful reason.
      if (!isGroqConfigured()) throw e;
      console.error("Deepgram STT failed — falling back to Groq Whisper:", e);
    }
  }

  if (isGroqConfigured()) {
    return await transcribeWithGroq(audioBuffer, mimeType);
  }

  throw new Error("NO_STT_PROVIDER_CONFIGURED");
}
