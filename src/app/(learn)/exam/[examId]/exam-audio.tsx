"use client";
import { useMemo } from "react";
import type { HSKLevel } from "@prisma/client";
import { AudioPlayer } from "@/components/learn/listening/audio-player";
import { Tapescript } from "@/components/learn/listening/tapescript";
import { useListeningAudio } from "@/components/learn/listening/use-listening-audio";
import { splitTranscript } from "@/lib/transcript";

/**
 * Bộ điều khiển audio cho MỘT tiểu phần nghe. Mỗi tiểu phần có engine riêng (như
 * đề thật phát audio theo từng phần). Có MP3 thì phát MP3; không thì đọc transcript
 * bằng giọng trình duyệt; review (sau nộp) thì nghe lại không giới hạn + hiện lời thoại.
 */
export function ExamAudio({
  audioUrl,
  transcript,
  hskLevel,
  submitted,
  showPinyin,
  onCharClick,
}: {
  audioUrl: string | null;
  transcript: string | null;
  hskLevel: HSKLevel;
  submitted: boolean;
  showPinyin: boolean;
  onCharClick: (char: string, pinyin: string, e: React.MouseEvent) => void;
}) {
  const segments = useMemo(() => splitTranscript(transcript), [transcript]);
  const maxPlays = hskLevel === "HSK1" || hskLevel === "HSK2" ? 3 : 2;

  const audio = useListeningAudio({ audioUrl, segments, maxPlays, reviewMode: submitted });

  // Không có gì để phát/đọc → không render khối audio.
  if (!audioUrl && segments.length === 0) return null;

  return (
    <div className="space-y-3">
      <AudioPlayer audio={audio} reviewMode={submitted} segmentCount={segments.length} />
      {submitted && segments.length > 0 && (
        <Tapescript
          segments={segments}
          showPinyin={showPinyin}
          evidenceMap={new Map()}
          currentSegment={audio.currentSegment}
          canReplay={audio.canSpeakSegments}
          onPlaySegment={(i) => audio.speakSegment(i)}
          onCharClick={onCharClick}
        />
      )}
    </div>
  );
}
