"use client";

import { motion } from "framer-motion";
import { ChapterBanner } from "./chapter-banner";
import { LessonNode } from "./lesson-node";
import type { CourseTheme, LessonStatus, RoadmapLessonDTO } from "@/lib/roadmap";

// ===== Hình học đường đi uốn lượn (toạ độ px, không gian cố định 300px) =====
const COL_W = 300;
const CENTER = COL_W / 2;
const AMP = 84; // biên độ lệch ngang
const SIZE = 76; // đường kính node
const R = SIZE / 2;
const STEP = 116; // khoảng cách dọc giữa tâm các node
// Chừa đủ chỗ phía trên node đầu tiên cho bong bóng "Bắt đầu" (đặt ở -top-9 so với
// node + chiều cao bong bóng). Cần >= R + ~50 để bong bóng không tràn lên banner.
const TOP = 88;
const BOTTOM = 44;
const ANG = 0.8; // bước pha của sóng sin

interface Point {
  x: number;
  y: number;
}

/** Đường cong mượt (cubic) đi qua các tâm node — điểm điều khiển ở giữa theo trục Y. */
function buildPath(pts: Point[]): string {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const my = (p0.y + p1.y) / 2;
    d += ` C ${p0.x.toFixed(1)} ${my.toFixed(1)}, ${p1.x.toFixed(1)} ${my.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

interface ChapterPathProps {
  index: number;
  title: string;
  lessons: RoadmapLessonDTO[];
  statuses: LessonStatus[];
  /** Lệch pha sóng sin để đường đi nối liền mạch giữa các chương. */
  phaseOffset: number;
  theme: CourseTheme;
  onSelect: (lesson: RoadmapLessonDTO) => void;
  onTrophy: (unlocked: boolean) => void;
}

export function ChapterPath({
  index,
  title,
  lessons,
  statuses,
  phaseOffset,
  theme,
  onSelect,
  onTrophy,
}: ChapterPathProps) {
  const count = lessons.length + 1; // + node phần thưởng cuối chương
  const pts: Point[] = Array.from({ length: count }, (_, i) => ({
    x: CENTER + Math.sin((phaseOffset + i) * ANG) * AMP,
    y: TOP + i * STEP,
  }));
  const height = TOP + (count - 1) * STEP + R + BOTTOM;

  const doneInChapter = statuses.filter((s) => s === "done").length;
  const currentLocal = statuses.indexOf("current");
  const chapterComplete = doneInChapter === lessons.length;

  // Node "đã đi tới" (để vẽ phần đường tô màu): nếu chương hoàn tất thì kéo tới
  // node phần thưởng; nếu có bài đang học thì tô đúng tới node đó (đúng cả khi
  // tiến độ không liền mạch); ngược lại dừng ở bài xong cuối cùng.
  let reachedIndex: number;
  if (chapterComplete) reachedIndex = count - 1;
  else if (currentLocal >= 0) reachedIndex = currentLocal;
  else reachedIndex = doneInChapter - 1;

  const fullD = buildPath(pts);
  const progressD = reachedIndex >= 1 ? buildPath(pts.slice(0, reachedIndex + 1)) : "";

  return (
    <section className="space-y-3">
      <ChapterBanner index={index} title={title} theme={theme} done={doneInChapter} total={lessons.length} />

      <div className="relative mx-auto" style={{ width: COL_W, height }}>
        <svg
          width={COL_W}
          height={height}
          viewBox={`0 0 ${COL_W} ${height}`}
          fill="none"
          className="absolute inset-0 text-zinc-300 dark:text-zinc-700"
          aria-hidden
        >
          {/* Đường nền nét chấm */}
          <path
            d={fullD}
            stroke="currentColor"
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray="1 18"
            opacity={0.8}
          />
          {/* Đường tiến độ tô màu, vẽ dần */}
          {progressD && (
            <motion.path
              d={progressD}
              stroke={theme.pathColor}
              strokeWidth={6}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
            />
          )}
        </svg>

        {lessons.map((lesson, i) => (
          <div
            key={lesson.id}
            className="absolute"
            style={{ left: pts[i].x - R, top: pts[i].y - R, width: SIZE, height: SIZE }}
          >
            <LessonNode
              status={statuses[i]}
              order={lesson.order}
              icon={lesson.icon}
              label={lesson.topic}
              theme={theme}
              size={SIZE}
              onClick={() => onSelect(lesson)}
            />
          </div>
        ))}

        {/* Node phần thưởng cuối chương */}
        <div
          className="absolute"
          style={{
            left: pts[count - 1].x - R,
            top: pts[count - 1].y - R,
            width: SIZE,
            height: SIZE,
          }}
        >
          <LessonNode
            kind="trophy"
            status={chapterComplete ? "done" : "locked"}
            theme={theme}
            size={SIZE}
            label={`Phần thưởng chương ${index}`}
            onClick={() => onTrophy(chapterComplete)}
          />
        </div>
      </div>
    </section>
  );
}
