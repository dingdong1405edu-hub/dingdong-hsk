"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/transcript";

// One audio controller for the whole listening test. It owns BOTH playback
// engines so there's never overlapping sound:
//   • mode "mp3" — a real <audio> element (uploaded / Voxtral-generated file).
//   • mode "tts" — the browser Web Speech engine reads the transcript sentence
//     by sentence (used when a test has no MP3, so listening is never dead).
//   • mode "none" — no MP3 and no usable speech engine; the caller reveals the
//     transcript (reading fallback) or an empty-state.
//
// Pre-submit, a full play-through is rate-limited like a real exam; in review
// mode replays are unlimited. `speakSegment` is a one-shot study replay of a
// single sentence (evidence box + tapescript) and stops the transport first.

type Status = "idle" | "playing" | "paused";
const SENTENCE_GAP_MS = 180;

function listVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

function chineseVoices(): SpeechSynthesisVoice[] {
  const voices = listVoices();
  const cn = voices.filter((v) => v.lang?.toLowerCase().startsWith("zh-cn"));
  const zh = voices.filter((v) => v.lang?.toLowerCase().startsWith("zh"));
  return cn.length ? cn : zh;
}

// Gender is taken ONLY from an explicit 男/女 label — never inferred from A/B
// turn order (which has no relation to who is male/female). Unknown speakers get
// a neutral pitch so we don't fabricate a misleading gender cue.
function speakerGender(speaker: string | null): "male" | "female" | null {
  if (!speaker) return null;
  if (/女/.test(speaker)) return "female";
  if (/男/.test(speaker)) return "male";
  return null;
}

function pitchForSpeaker(speaker: string | null): number {
  const g = speakerGender(speaker);
  if (g === "female") return 1.15;
  if (g === "male") return 0.85;
  return 1; // A / B / 甲 / 乙 / letters — neutral
}

// Give each distinct speaker a stable voice so turns are distinguishable,
// without implying gender from order.
function voiceForSpeaker(
  speaker: string | null,
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  if (!speaker) return voices[0];
  const code = speaker.toUpperCase().charCodeAt(0);
  return voices[code % voices.length];
}

function clampRate(r: number): number {
  return Math.max(0.5, Math.min(1.5, r));
}

export interface ListeningAudio {
  mode: "mp3" | "tts" | "none";
  available: boolean;
  /** Can the per-sentence replay (browser TTS) actually produce Chinese sound? */
  canSpeakSegments: boolean;
  status: Status;
  playing: boolean;
  paused: boolean;
  rate: number;
  plays: number;
  remainingPlays: number | null; // null = unlimited (review mode)
  canStart: boolean;
  currentSegment: number | null;
  currentTime: number;
  duration: number;
  toggle: () => void;
  restart: () => void;
  stop: () => void;
  seek: (t: number) => void;
  setRate: (r: number) => void;
  speakSegment: (index: number) => void;
}

export function useListeningAudio(opts: {
  audioUrl?: string | null;
  segments: TranscriptSegment[];
  maxPlays: number;
  reviewMode: boolean;
}): ListeningAudio {
  const { audioUrl, segments, maxPlays, reviewMode } = opts;
  const hasMp3 = !!(audioUrl && audioUrl.trim());

  const [ttsSupported, setTtsSupported] = useState(false);
  const [hasZhVoice, setHasZhVoice] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRateState] = useState(1);
  const [plays, setPlays] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mp3Failed, setMp3Failed] = useState(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(1);
  const reviewModeRef = useRef(reviewMode);
  // TTS sequencer state.
  const ttsCancelled = useRef(false);
  const ttsPaused = useRef(false);
  const ttsActive = useRef(false); // an utterance is currently speaking
  const ttsTimer = useRef<number | null>(null); // pending inter-sentence timer
  const ttsResumeIndex = useRef(0);
  // A fresh play-through whose play-count charge is still pending (charged only
  // once audio actually starts, so a broken MP3 never burns a play).
  const freshPending = useRef(false);

  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);
  useEffect(() => {
    reviewModeRef.current = reviewMode;
  }, [reviewMode]);

  const speechReady = ttsSupported && hasZhVoice;
  const canTts = speechReady && segments.length > 0;
  const mode: ListeningAudio["mode"] = hasMp3 && !mp3Failed ? "mp3" : canTts ? "tts" : "none";

  // Detect speech support + a Chinese voice (some browsers populate voices async).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setTtsSupported(true);
    const warm = () => {
      const vs = listVoices();
      setHasZhVoice(vs.some((v) => v.lang?.toLowerCase().startsWith("zh")));
    };
    warm();
    window.speechSynthesis.onvoiceschanged = warm;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const clearTtsTimer = useCallback(() => {
    if (ttsTimer.current !== null) {
      clearTimeout(ttsTimer.current);
      ttsTimer.current = null;
    }
  }, []);

  // Charge one play the moment audio truly starts (idempotent per fresh start).
  const chargePlay = useCallback(() => {
    if (freshPending.current) {
      if (!reviewModeRef.current) setPlays((p) => p + 1);
      freshPending.current = false;
    }
  }, []);

  // MP3 element lifecycle.
  useEffect(() => {
    if (!hasMp3 || typeof window === "undefined") return;
    setMp3Failed(false);
    const a = new Audio(audioUrl!);
    a.preload = "metadata";
    a.playbackRate = rateRef.current;
    audioElRef.current = a;
    const onTime = () => setCurrentTime(a.currentTime);
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlaying = () => chargePlay();
    const onEnd = () => {
      setStatus("idle");
      setCurrentTime(0);
    };
    // A 404 / decode error flips to the browser-TTS fallback so a bad URL never
    // leaves the test silent. The failed attempt was never charged a play.
    const onErr = () => {
      setMp3Failed(true);
      setStatus("idle");
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onErr);
      audioElRef.current = null;
    };
  }, [hasMp3, audioUrl, chargePlay]);

  useEffect(() => {
    if (audioElRef.current) audioElRef.current.playbackRate = rate;
  }, [rate]);

  // Cancel any in-flight speech on unmount.
  useEffect(() => {
    return () => {
      ttsCancelled.current = true;
      clearTtsTimer();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      audioElRef.current?.pause();
    };
  }, [clearTtsTimer]);

  const remainingPlays = reviewMode ? null : Math.max(0, maxPlays - plays);
  const canStart = reviewMode || plays < maxPlays;

  // ----- TTS sequencer: speak `segments` from `fromIndex` -----
  const runTts = useCallback(
    (fromIndex: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      clearTtsTimer();
      synth.cancel();
      ttsCancelled.current = false;
      ttsPaused.current = false;
      ttsActive.current = false;
      const voices = chineseVoices();
      let i = fromIndex;
      ttsResumeIndex.current = i;

      const advance = () => {
        ttsActive.current = false;
        if (ttsCancelled.current || ttsPaused.current) return;
        i += 1;
        ttsResumeIndex.current = i;
        ttsTimer.current = window.setTimeout(speakNext, SENTENCE_GAP_MS);
      };

      const speakNext = () => {
        if (ttsCancelled.current || ttsPaused.current) return;
        if (i >= segments.length) {
          setStatus("idle");
          setCurrentSegment(null);
          ttsActive.current = false;
          return;
        }
        ttsResumeIndex.current = i;
        const seg = segments[i];
        setCurrentSegment(i);
        const u = new SpeechSynthesisUtterance(seg.text);
        u.lang = "zh-CN";
        u.rate = clampRate(rateRef.current * 0.95);
        u.pitch = pitchForSpeaker(seg.speaker);
        const v = voiceForSpeaker(seg.speaker, voices);
        if (v) u.voice = v;
        u.onstart = () => {
          ttsActive.current = true;
          chargePlay();
        };
        u.onend = advance;
        u.onerror = advance;
        synth.speak(u);
      };

      speakNext();
    },
    [segments, clearTtsTimer, chargePlay],
  );

  const startFresh = useCallback(() => {
    if (!canStart) return;
    freshPending.current = true;
    setStatus("playing");
    if (mode === "mp3" && audioElRef.current) {
      const a = audioElRef.current;
      a.currentTime = 0;
      void a.play().catch(() => setStatus("idle"));
    } else if (mode === "tts") {
      runTts(0);
    } else {
      freshPending.current = false;
      setStatus("idle");
    }
  }, [canStart, mode, runTts]);

  const resume = useCallback(() => {
    setStatus("playing");
    if (mode === "mp3" && audioElRef.current) {
      void audioElRef.current.play().catch(() => setStatus("idle"));
    } else if (mode === "tts") {
      ttsPaused.current = false;
      if (ttsActive.current && typeof window !== "undefined") {
        window.speechSynthesis.resume();
      } else {
        runTts(ttsResumeIndex.current);
      }
    }
  }, [mode, runTts]);

  const pause = useCallback(() => {
    setStatus("paused");
    if (mode === "mp3" && audioElRef.current) {
      audioElRef.current.pause();
    } else if (mode === "tts" && typeof window !== "undefined") {
      ttsPaused.current = true;
      clearTtsTimer();
      if (ttsActive.current) window.speechSynthesis.pause();
    }
  }, [mode, clearTtsTimer]);

  const stop = useCallback(() => {
    setStatus("idle");
    setCurrentSegment(null);
    freshPending.current = false;
    if (mode === "mp3" && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      ttsCancelled.current = true;
      ttsPaused.current = false;
      ttsActive.current = false;
      clearTtsTimer();
      window.speechSynthesis.cancel();
    }
  }, [mode, clearTtsTimer]);

  const toggle = useCallback(() => {
    if (status === "playing") pause();
    else if (status === "paused") resume();
    else startFresh();
  }, [status, pause, resume, startFresh]);

  const restart = useCallback(() => {
    if (!canStart) return;
    stop();
    window.setTimeout(() => startFresh(), 0);
  }, [canStart, stop, startFresh]);

  const seek = useCallback(
    (t: number) => {
      if (mode === "mp3" && audioElRef.current) {
        audioElRef.current.currentTime = t;
        setCurrentTime(t);
      }
    },
    [mode],
  );

  const setRate = useCallback(
    (r: number) => {
      rateRef.current = r;
      setRateState(r);
      // For TTS the rate is baked into each utterance, so re-speak the current
      // sentence at the new rate to make the speed control responsive (no charge).
      if (mode === "tts" && status === "playing" && currentSegment !== null) {
        runTts(currentSegment);
      }
    },
    [mode, status, currentSegment, runTts],
  );

  // One-shot study replay of a single sentence (evidence / tapescript). Stops the
  // transport first, then speaks just that line via the browser engine.
  const speakSegment = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const seg = segments[index];
      if (!seg) return;
      ttsCancelled.current = true;
      ttsPaused.current = false;
      ttsActive.current = false;
      clearTtsTimer();
      window.speechSynthesis.cancel();
      audioElRef.current?.pause();
      setStatus("idle");

      const voices = chineseVoices();
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = "zh-CN";
      u.rate = clampRate(rateRef.current * 0.95);
      u.pitch = pitchForSpeaker(seg.speaker);
      const v = voiceForSpeaker(seg.speaker, voices);
      if (v) u.voice = v;
      setCurrentSegment(index);
      u.onend = () => setCurrentSegment((c) => (c === index ? null : c));
      u.onerror = () => setCurrentSegment((c) => (c === index ? null : c));
      window.speechSynthesis.speak(u);
    },
    [segments, clearTtsTimer],
  );

  return {
    mode,
    available: mode !== "none",
    canSpeakSegments: speechReady,
    status,
    playing: status === "playing",
    paused: status === "paused",
    rate,
    plays,
    remainingPlays,
    canStart,
    currentSegment,
    currentTime,
    duration,
    toggle,
    restart,
    stop,
    seek,
    setRate,
    speakSegment,
  };
}
