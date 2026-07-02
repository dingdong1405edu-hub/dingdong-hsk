import { RAW_FORUM_CATEGORIES } from "./community-forum-data";

/** Một câu trả lời trong chủ đề diễn đàn. */
export interface ForumReply {
  author: string;
  text: string;
  time: string;
  likes: number;
}

/** Chủ đề thô như dữ liệu sinh sẵn (chưa gắn id/chuyên mục). */
export interface RawThread {
  author: string;
  title: string;
  body: string;
  hsk: string;
  tag: string;
  likes: number;
  views: number;
  time: string;
  solved: boolean;
  hot: boolean;
  replies: ForumReply[];
}

export interface RawForumCategory {
  key: string;
  label: string;
  threads: RawThread[];
}

/** Chủ đề đã chuẩn hoá để render (có id, chuyên mục, cờ ghim...). */
export interface ForumThread extends RawThread {
  id: string;
  category: string;
  categoryLabel: string;
  pinned: boolean;
  replyCount: number;
}

export interface ForumCategoryMeta {
  key: string;
  label: string;
  count: number;
}

export interface ForumStats {
  members: number;
  online: number;
  threads: number;
  posts: number;
}

// Bài ghim của ban quản trị — để diễn đàn trông có người điều phối, chỉn chu.
const PINNED: Array<{ category: string; categoryLabel: string; thread: RawThread }> = [
  {
    category: "general",
    categoryLabel: "Hỏi đáp chung",
    thread: {
      author: "Ban Quản Trị DingDong",
      title: "🎉 Chào mừng bạn đến với Cộng đồng DingDong HSK!",
      body:
        "Đây là nơi cả nhà cùng hỏi đáp, chia sẻ mẹo học, khoe thành tích và cổ vũ nhau chinh phục tiếng Trung. Hãy giới thiệu bản thân, đặt câu hỏi thoải mái và nhớ giữ thái độ thân thiện nha. Chúc mọi người học vui — 加油! 💪",
      hsk: "",
      tag: "Thông báo",
      likes: 214,
      views: 5820,
      time: "2 ngày trước",
      solved: false,
      hot: true,
      replies: [
        { author: "Mèo Con HSK", text: "Diễn đàn có tâm ghê, chào cả nhà mình mới tham gia nè 🙌", time: "2 ngày trước", likes: 28 },
        { author: "an_nguyen", text: "Cảm ơn admin, cộng đồng dễ thương quá, quyết tâm học đều mỗi ngày!", time: "hôm qua", likes: 19 },
        { author: "Trần Thu Hà", text: "Hóng có thêm mục thi đua tuần nữa thì tuyệt 🥰", time: "hôm qua", likes: 14 },
      ],
    },
  },
  {
    category: "general",
    categoryLabel: "Hỏi đáp chung",
    thread: {
      author: "Ban Quản Trị DingDong",
      title: "📌 Mẹo đặt câu hỏi để được giải đáp nhanh nhất",
      body:
        "Khi hỏi về ngữ pháp/từ vựng, bạn nên: (1) ghi rõ câu ví dụ bằng chữ Hán + pinyin, (2) nói mình đang ở cấp HSK mấy, (3) nêu đúng chỗ mình đang bí. Càng cụ thể thì mọi người càng dễ giúp bạn. Chúc học tốt!",
      hsk: "",
      tag: "Hướng dẫn",
      likes: 156,
      views: 3410,
      time: "tuần trước",
      solved: false,
      hot: false,
      replies: [
        { author: "Hoàng Minh Đức", text: "Chuẩn luôn, hỏi có ví dụ cụ thể là trả lời cái rẹt 😄", time: "tuần trước", likes: 17 },
        { author: "susu_learning", text: "Ghim luôn bài này cho người mới đọc ạ 📌", time: "6 ngày trước", likes: 11 },
      ],
    },
  },
];

/** Chủ đề đã gắn id + cờ, sắp xếp: ghim trước, rồi tới nội dung sinh sẵn. */
export const FORUM_THREADS: ForumThread[] = [
  ...PINNED.map((p, i) => ({
    ...p.thread,
    id: `pinned-${i}`,
    category: p.category,
    categoryLabel: p.categoryLabel,
    pinned: true,
    replyCount: p.thread.replies.length,
  })),
  ...RAW_FORUM_CATEGORIES.flatMap((c) =>
    c.threads.map((t, i) => ({
      ...t,
      id: `${c.key}-${i}`,
      category: c.key,
      categoryLabel: c.label,
      pinned: false,
      replyCount: t.replies.length,
    })),
  ),
];

/** Danh sách chuyên mục kèm số lượng chủ đề (dùng cho bộ lọc). */
export const FORUM_CATEGORIES: ForumCategoryMeta[] = RAW_FORUM_CATEGORIES.map((c) => ({
  key: c.key,
  label: c.label,
  count: FORUM_THREADS.filter((t) => t.category === c.key).length,
}));

const TOTAL_REPLIES = FORUM_THREADS.reduce((n, t) => n + t.replies.length, 0);

/** Thống kê cộng đồng hiển thị ở đầu trang (số thành viên/online là ước lượng). */
export const FORUM_STATS: ForumStats = {
  members: 2913,
  online: 84,
  threads: FORUM_THREADS.length,
  posts: FORUM_THREADS.length + TOTAL_REPLIES,
};

/** Thành viên tích cực (đếm số bài + trả lời) — bảng "đóng góp nổi bật". */
export function topContributors(limit = 5): Array<{ name: string; posts: number }> {
  const count = new Map<string, number>();
  for (const t of FORUM_THREADS) {
    if (t.pinned) continue; // bỏ tài khoản ban quản trị khỏi bảng
    count.set(t.author, (count.get(t.author) ?? 0) + 1);
    for (const r of t.replies) count.set(r.author, (count.get(r.author) ?? 0) + 1);
  }
  return [...count.entries()]
    .map(([name, posts]) => ({ name, posts }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, limit);
}

const AVATAR_COLORS = [
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
  "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
];

/** Màu avatar cố định theo tên (để mỗi người một màu ổn định). */
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Ký tự đầu để làm avatar chữ. */
export function avatarInitial(name: string): string {
  const c = name.trim().charAt(0);
  return c ? c.toUpperCase() : "?";
}
