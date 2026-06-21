import {
  BookOpen,
  SpellCheck,
  Headphones,
  Mic,
  BookText,
  PenLine,
  type LucideIcon,
} from "lucide-react";

/**
 * Cấu hình hiển thị cho phần "Học theo lộ trình" (Duolingo-style map).
 * Tách riêng phần trình bày (theme, icon kỹ năng) khỏi dữ liệu DB để dùng được
 * ở cả server lẫn client. KHÔNG import @prisma/client ở đây — cấp HSK chỉ là
 * chuỗi "HSK1".."HSK6" nên dùng union string cho gọn và an toàn cho client bundle.
 */

export const LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"] as const;
export type Level = (typeof LEVELS)[number];

export type SkillKey =
  | "VOCAB"
  | "GRAMMAR"
  | "LISTENING"
  | "SPEAKING"
  | "READING"
  | "WRITING";

/** Theme từng khóa HSK — toàn class Tailwind dạng literal để JIT quét được. */
export interface CourseTheme {
  label: string; // "HSK 1"
  /** Chữ Hán trang trí (số thứ tự cấp). */
  char: string;
  /** Cover thẻ "thế giới" ở trang chọn khóa. */
  cardCover: string;
  /** Banner đầu trang map. */
  hero: string;
  accentText: string;
  accentBg: string;
  accentSoft: string;
  accentBorder: string;
  /** Vòng nhấp nháy quanh node đang học. */
  ring: string;
  /** Mặt node (nút tròn). */
  nodeFace: string;
  /** Gờ 3D phía dưới node. */
  nodeBase: string;
  /** Đổ bóng phát sáng cho node hiện tại. */
  glow: string;
  /** Màu nét vẽ đường đi đã hoàn thành (SVG stroke — dùng mã màu, không phải class). */
  pathColor: string;
}

export const COURSE_THEME: Record<Level, CourseTheme> = {
  HSK1: {
    label: "HSK 1",
    char: "一",
    cardCover: "from-emerald-400 via-emerald-500 to-teal-500",
    hero: "from-emerald-500 to-teal-600",
    accentText: "text-emerald-600",
    accentBg: "bg-emerald-500",
    accentSoft: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    ring: "ring-emerald-300",
    nodeFace: "bg-gradient-to-b from-emerald-400 to-emerald-500",
    nodeBase: "bg-emerald-700",
    glow: "shadow-emerald-500/40",
    pathColor: "#10b981",
  },
  HSK2: {
    label: "HSK 2",
    char: "二",
    cardCover: "from-teal-400 via-teal-500 to-cyan-500",
    hero: "from-teal-500 to-cyan-600",
    accentText: "text-teal-600",
    accentBg: "bg-teal-500",
    accentSoft: "bg-teal-50",
    accentBorder: "border-teal-200",
    ring: "ring-teal-300",
    nodeFace: "bg-gradient-to-b from-teal-400 to-teal-500",
    nodeBase: "bg-teal-700",
    glow: "shadow-teal-500/40",
    pathColor: "#14b8a6",
  },
  HSK3: {
    label: "HSK 3",
    char: "三",
    cardCover: "from-sky-400 via-sky-500 to-blue-500",
    hero: "from-sky-500 to-blue-600",
    accentText: "text-sky-600",
    accentBg: "bg-sky-500",
    accentSoft: "bg-sky-50",
    accentBorder: "border-sky-200",
    ring: "ring-sky-300",
    nodeFace: "bg-gradient-to-b from-sky-400 to-sky-500",
    nodeBase: "bg-sky-700",
    glow: "shadow-sky-500/40",
    pathColor: "#0ea5e9",
  },
  HSK4: {
    label: "HSK 4",
    char: "四",
    cardCover: "from-violet-400 via-violet-500 to-purple-500",
    hero: "from-violet-500 to-purple-600",
    accentText: "text-violet-600",
    accentBg: "bg-violet-500",
    accentSoft: "bg-violet-50",
    accentBorder: "border-violet-200",
    ring: "ring-violet-300",
    nodeFace: "bg-gradient-to-b from-violet-400 to-violet-500",
    nodeBase: "bg-violet-700",
    glow: "shadow-violet-500/40",
    pathColor: "#8b5cf6",
  },
  HSK5: {
    label: "HSK 5",
    char: "五",
    cardCover: "from-amber-400 via-orange-500 to-orange-500",
    hero: "from-orange-500 to-amber-600",
    accentText: "text-orange-600",
    accentBg: "bg-orange-500",
    accentSoft: "bg-orange-50",
    accentBorder: "border-orange-200",
    ring: "ring-orange-300",
    nodeFace: "bg-gradient-to-b from-amber-400 to-orange-500",
    nodeBase: "bg-orange-700",
    glow: "shadow-orange-500/40",
    pathColor: "#f97316",
  },
  HSK6: {
    label: "HSK 6",
    char: "六",
    cardCover: "from-rose-400 via-rose-500 to-red-500",
    hero: "from-rose-500 to-red-600",
    accentText: "text-rose-600",
    accentBg: "bg-rose-500",
    accentSoft: "bg-rose-50",
    accentBorder: "border-rose-200",
    ring: "ring-rose-300",
    nodeFace: "bg-gradient-to-b from-rose-400 to-rose-500",
    nodeBase: "bg-rose-700",
    glow: "shadow-rose-500/40",
    pathColor: "#f43f5e",
  },
};

/** 6 kỹ năng trong mỗi bài lộ trình, theo thứ tự hiển thị. */
export interface SkillMeta {
  key: SkillKey;
  label: string;
  labelZh: string;
  icon: LucideIcon;
  iconBg: string;
  iconText: string;
}

export const SKILL_META: SkillMeta[] = [
  { key: "VOCAB", label: "Từ vựng", labelZh: "词汇", icon: BookOpen, iconBg: "bg-emerald-100", iconText: "text-emerald-600" },
  { key: "GRAMMAR", label: "Ngữ pháp", labelZh: "语法", icon: SpellCheck, iconBg: "bg-sky-100", iconText: "text-sky-600" },
  { key: "LISTENING", label: "Nghe", labelZh: "听力", icon: Headphones, iconBg: "bg-violet-100", iconText: "text-violet-600" },
  { key: "SPEAKING", label: "Nói", labelZh: "口语", icon: Mic, iconBg: "bg-rose-100", iconText: "text-rose-600" },
  { key: "READING", label: "Đọc", labelZh: "阅读", icon: BookText, iconBg: "bg-amber-100", iconText: "text-amber-600" },
  { key: "WRITING", label: "Viết", labelZh: "写作", icon: PenLine, iconBg: "bg-teal-100", iconText: "text-teal-600" },
];

export function levelToSlug(level: string): string {
  return level.toLowerCase();
}

export function slugToLevel(slug: string): Level | null {
  const upper = slug.toUpperCase();
  return (LEVELS as readonly string[]).includes(upper) ? (upper as Level) : null;
}

export function isLevel(value: string): value is Level {
  return (LEVELS as readonly string[]).includes(value);
}

/** Theme an toàn (fallback về HSK1 nếu cấp không hợp lệ). */
export function themeFor(level: string): CourseTheme {
  return isLevel(level) ? COURSE_THEME[level] : COURSE_THEME.HSK1;
}

// ===== DTO truyền từ server → client (đã serialize, không chứa Date/Prisma) =====

export type LessonStatus = "done" | "current" | "locked";

export interface RoadmapSectionDTO {
  skill: SkillKey;
  published: boolean;
}

export interface RoadmapLessonDTO {
  id: string;
  order: number;
  topic: string;
  topicZh: string;
  icon: string | null;
  description: string | null;
  chapter: string | null;
  chapterOrder: number;
  xpReward: number;
  completed: boolean;
  skillsDone: SkillKey[];
  sections: RoadmapSectionDTO[];
}
