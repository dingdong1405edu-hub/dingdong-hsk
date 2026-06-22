"use client";
import { Play, Pause, RotateCcw, Volume2, Gauge, Radio, AlertTriangle } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { ListeningAudio } from "./use-listening-audio";

const SPEEDS = [0.75, 1, 1.25, 1.5];

function Equalizer({ active }: { active: boolean }) {
  // Five bars; in "playing" state they bounce with staggered delays.
  const delays = ["0s", "0.15s", "0.3s", "0.45s", "0.2s"];
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {delays.map((d, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-teal-500", active && "animate-eq")}
          style={{ height: "100%", animationDelay: d, transform: active ? undefined : "scaleY(0.35)" }}
        />
      ))}
    </div>
  );
}

export function AudioPlayer({
  audio,
  reviewMode,
  segmentCount,
}: {
  audio: ListeningAudio;
  reviewMode: boolean;
  segmentCount: number;
}) {
  const {
    mode,
    playing,
    status,
    rate,
    remainingPlays,
    canStart,
    currentSegment,
    currentTime,
    duration,
    toggle,
    restart,
    seek,
    setRate,
  } = audio;

  const ttsProgress =
    segmentCount > 0 && currentSegment !== null ? ((currentSegment + 1) / segmentCount) * 100 : 0;
  const mp3Progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const blocked = !canStart && status === "idle";
  // Restart always begins a fresh play-through, so it's unavailable whenever a
  // fresh start can't be charged — even while paused (avoids a dead control that
  // would silently discard the paused listen).
  const restartBlocked = !canStart;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-teal-50/70 to-white p-4 shadow-sm">
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Play / pause */}
        <button
          onClick={toggle}
          disabled={mode === "none" || blocked}
          aria-label={playing ? "Tạm dừng" : "Phát"}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md transition-transform active:scale-95",
            mode === "none" || blocked ? "cursor-not-allowed bg-zinc-300" : "bg-teal-600 hover:bg-teal-700",
          )}
        >
          {playing ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
        </button>

        {/* Middle: progress / status */}
        <div className="min-w-0 flex-1">
          {mode === "mp3" ? (
            <>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                aria-label="Tua audio"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-teal-100 accent-teal-600"
                style={{
                  background: `linear-gradient(to right, rgb(13 148 136) ${mp3Progress}%, rgb(204 251 241) ${mp3Progress}%)`,
                }}
              />
              <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-muted-foreground">
                <span>{formatDuration(Math.floor(currentTime))}</span>
                <span>{duration ? formatDuration(Math.floor(duration)) : "--:--"}</span>
              </div>
            </>
          ) : mode === "tts" ? (
            <div className="flex items-center gap-3">
              <Equalizer active={playing} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium text-teal-700">
                  <Radio className="h-3.5 w-3.5" /> Giọng đọc tự động
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-teal-100">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-300"
                    style={{ width: `${ttsProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Hiện không phát được audio trên thiết bị này.</span>
            </div>
          )}
        </div>

        {/* Restart */}
        {mode !== "none" && (
          <button
            onClick={restart}
            disabled={restartBlocked}
            aria-label="Nghe lại từ đầu"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors",
              restartBlocked
                ? "cursor-not-allowed text-zinc-300"
                : "text-muted-foreground hover:border-teal-300 hover:text-teal-700",
            )}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Controls row */}
      {mode !== "none" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-teal-100/70 pt-3">
          {/* Play count */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
              reviewMode
                ? "bg-emerald-100 text-emerald-700"
                : remainingPlays && remainingPlays > 0
                  ? "bg-teal-100 text-teal-700"
                  : "bg-rose-100 text-rose-700",
            )}
          >
            <Volume2 className="h-3.5 w-3.5" />
            {reviewMode ? "Nghe lại không giới hạn" : `Còn ${remainingPlays} lần nghe`}
          </span>

          {/* Speed */}
          <div className="flex items-center gap-1">
            <Gauge className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => setRate(s)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                  rate === s
                    ? "bg-teal-600 text-white"
                    : "border text-muted-foreground hover:border-teal-300 hover:text-teal-700",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
