"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/lib/transcript";

// One audio controller for the whole listening test. It owns BOTH playback
// engines so there's never overlapping sound:
//   • mode "mp3" — a real <audio> element (uploaded / Voxtral-generated file).
//   • mode "tts" — the browser Web Speech engine reads the transcript sentence
//     by sentence (used when a test has no MP3, so listening is never dead).
//   • mode "none" — no MP3 and no speech engine; the caller reveals the
//     transcript so the exercise degrades to a reading task.
//
// Pre-submit, a full play-through is rate-limited like a real exam; in review
// mode replays are unlimited. `speakSegment` is a one-shot study replay of a
// single sentence (used by the evidence box + tapescript) and stops the
// transport first.

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

/** Second speaker? (B / 乙 / 女) — used to alternate voice + pitch for dialogues. */
function isSecondSpeaker(speaker: string | null): boolean {
  return !!speaker && /^(b|乙|女)$/i.test(speaker);
}

export interface ListeningAudio {
  mode: "mp3" | "tts" | "none";
  available: boolean;
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
  const [status, setStatus] = useState<Status>("idle");
  const [rate, setRateState] = useState(1);
  const [plays, setPlays] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mp3Failed, setMp3Failed] = useState(false);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rateRef = useRef(1);
  const ttsCancelled = useRef(false);

  // Keep latest values for use inside long-lived closures.
  useEffect(() => {
    rateRef.current = rate;
  }, [rate]);

  // Resolve the playback mode. A broken MP3 URL falls back to browser TTS, and
  // TTS itself needs transcript sentences to read — otherwise there's nothing to
  // play and we degrade to "none" (caller reveals the transcript / shows a note).
  const canTts = ttsSupported && segments.length > 0;
  const mode: ListeningAudio["mode"] = hasMp3 && !mp3Failed ? "mp3" : canTts ? "tts" : "none";

  // Detect speech support + warm the voice list (some browsers populate it async).
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setTtsSupported(true);
    const warm = () => listVoices();
    warm();
    window.speechSynthesis.onvoiceschanged = warm;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
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
    const onEnd = () => {
      setStatus("idle");
      setCurrentTime(0);
    };
    // A 404 / decode error flips the mode to the browser-TTS fallback so the
    // test is never left without any audio because of a bad URL.
    const onErr = () => {
      setMp3Failed(true);
      setStatus("idle");
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onErr);
      audioElRef.current = null;
    };
  }, [hasMp3, audioUrl]);

  useEffect(() => {
    if (audioElRef.current) audioElRef.current.playbackRate = rate;
  }, [rate]);

  // Cancel any in-flight speech on unmount.
  useEffect(() => {
    return () => {
      ttsCancelled.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      audioElRef.current?.pause();
    };
  }, []);

  const remainingPlays = reviewMode ? null : Math.max(0, maxPlays - plays);
  const canStart = reviewMode || plays < maxPlays;

  // ----- TTS sequencer -----
  const runTts = useCallback(
    (fromIndex: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      ttsCancelled.current = false;
      const voices = chineseVoices();
      let i = fromIndex;

      const speakNext = () => {
        if (ttsCancelled.current) return;
        if (i >= segments.length) {
          setStatus("idle");
          setCurrentSegment(null);
          return;
        }
        const seg = segments[i];
        setCurrentSegment(i);
        const u = new SpeechSynthesisUtterance(seg.text);
        u.lang = "zh-CN";
        u.rate = Math.max(0.5, Math.min(1.5, rateRef.current * 0.95));
        const second = isSecondSpeaker(seg.speaker);
        const v = second ? voices[1] ?? voices[0] : voices[0];
        if (v) u.voice = v;
        u.pitch = second ? 0.85 : 1.1;
        const advance = () => {
          i += 1;
          if (!ttsCancelled.current) window.setTimeout(speakNext, SENTENCE_GAP_MS);
        };
        u.onend = advance;
        u.onerror = advance;
        synth.speak(u);
      };
      speakNext();
    },
    [segments],
  );

  const startFresh = useCallback(() => {
    if (!canStart) return;
    if (!reviewMode) setPlays((p) => p + 1);
    setStatus("playing");
    if (mode === "mp3" && audioElRef.current) {
      const a = audioElRef.current;
      a.currentTime = 0;
      void a.play().catch(() => setStatus("idle"));
    } else if (mode === "tts") {
      runTts(0);
    }
  }, [canStart, reviewMode, mode, runTts]);

  const resume = useCallback(() => {
    setStatus("playing");
    if (mode === "mp3" && audioElRef.current) {
      void audioElRef.current.play().catch(() => setStatus("idle"));
    } else if (mode === "tts" && typeof window !== "undefined") {
      window.speechSynthesis.resume();
    }
  }, [mode]);

  const pause = useCallback(() => {
    setStatus("paused");
    if (mode === "mp3" && audioElRef.current) {
      audioElRef.current.pause();
    } else if (mode === "tts" && typeof window !== "undefined") {
      window.speechSynthesis.pause();
    }
  }, [mode]);

  const stop = useCallback(() => {
    setStatus("idle");
    setCurrentSegment(null);
    if (mode === "mp3" && audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      setCurrentTime(0);
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      ttsCancelled.current = true;
      window.speechSynthesis.cancel();
    }
  }, [mode]);

  const toggle = useCallback(() => {
    if (status === "playing") pause();
    else if (status === "paused") resume();
    else startFresh();
  }, [status, pause, resume, startFresh]);

  const restart = useCallback(() => {
    stop();
    // Defer so the cancel/pause settles before a fresh start.
    window.setTimeout(() => startFresh(), 0);
  }, [stop, startFresh]);

  const seek = useCallback(
    (t: number) => {
      if (mode === "mp3" && audioElRef.current) {
        audioElRef.current.currentTime = t;
        setCurrentTime(t);
      }
    },
    [mode],
  );

  const setRate = useCallback((r: number) => {
    setRateState(r);
  }, []);

  // One-shot study replay of a single sentence (evidence / tapescript). Stops the
  // transport first, then speaks just that line via the browser engine.
  const speakSegment = useCallback(
    (index: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const seg = segments[index];
      if (!seg) return;
      // Stop transport.
      ttsCancelled.current = true;
      window.speechSynthesis.cancel();
      audioElRef.current?.pause();
      setStatus("idle");

      const voices = chineseVoices();
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = "zh-CN";
      u.rate = Math.max(0.5, Math.min(1.5, rateRef.current * 0.95));
      const second = isSecondSpeaker(seg.speaker);
      const v = second ? voices[1] ?? voices[0] : voices[0];
      if (v) u.voice = v;
      u.pitch = second ? 0.85 : 1.1;
      setCurrentSegment(index);
      u.onend = () => setCurrentSegment((c) => (c === index ? null : c));
      u.onerror = () => setCurrentSegment((c) => (c === index ? null : c));
      window.speechSynthesis.speak(u);
    },
    [segments],
  );

  return {
    mode,
    available: mode !== "none",
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
