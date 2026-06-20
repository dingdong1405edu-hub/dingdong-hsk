// Audio playback for the vocabulary flow. Priority: a recorded `audioUrl`
// (uploaded/linked by admin) if present, otherwise fall back to the browser's
// Web Speech API in Mandarin (zh-CN). Both are browser-only — guarded for SSR.

function pickChineseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("zh-cn")) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("zh"))
  );
}

/** Speak Chinese text via the browser TTS engine (zh-CN), slightly slowed. */
export function speakChinese(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-CN";
    utter.rate = 0.85;
    const voice = pickChineseVoice();
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  } catch {
    // Browser without TTS support — silently no-op.
  }
}

/**
 * Play a word's pronunciation: the recorded clip if available, else TTS.
 * Falls back to TTS if the audio file fails to load/play.
 */
export function playWord(opts: { hanzi: string; audioUrl?: string | null }): void {
  if (typeof window === "undefined") return;
  const { hanzi, audioUrl } = opts;
  if (audioUrl) {
    try {
      const audio = new Audio(audioUrl);
      audio.play().catch(() => speakChinese(hanzi));
      return;
    } catch {
      speakChinese(hanzi);
      return;
    }
  }
  speakChinese(hanzi);
}

/** Whether the current device is touch-first (coarse pointer) — used to decide
 *  if the handwriting step is required (touch) or skippable (desktop). */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}
