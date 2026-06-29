import type { VocabWordCard } from "@/types";
import { reviewRoadmapWordAction } from "@/server/actions/roadmap-review";

/**
 * Ghi một lượt ôn từ vựng lộ trình vào RoadmapWordReview (khoá theo `hanzi`).
 * Truyền làm prop `persist` cho ReviewFlow ở các luồng ôn của lộ trình. Gọi nền
 * (fire-and-forget) — lỗi không chặn trải nghiệm ôn.
 */
export function persistRoadmapReview(word: VocabWordCard, quality: number) {
  void reviewRoadmapWordAction({
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
    examples: word.examples,
    audioUrl: word.audioUrl,
    quality,
  }).catch(() => {});
}
