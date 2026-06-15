import { createClient } from "@deepgram/sdk";

// Lazy init (see src/lib/claude.ts) so a missing key never breaks build/import.
let _deepgram: ReturnType<typeof createClient> | null = null;
function getDeepgram(): ReturnType<typeof createClient> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("DEEPGRAM_API_KEY_MISSING");
  if (!_deepgram) _deepgram = createClient(apiKey);
  return _deepgram;
}

export function isTranscriptionConfigured(): boolean {
  return Boolean(process.env.DEEPGRAM_API_KEY);
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const { result, error } = await getDeepgram().listen.prerecorded.transcribeFile(audioBuffer, {
    model: "nova-2",
    language: "zh-CN",
    smart_format: true,
    punctuate: true,
  });

  if (error) throw new Error(`Deepgram error: ${error.message}`);

  const transcript =
    result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  return transcript;
}
