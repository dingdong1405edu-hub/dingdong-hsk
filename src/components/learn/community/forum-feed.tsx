"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  MessagesSquare,
  Heart,
  Eye,
  Search,
  Pin,
  Flame,
  CheckCircle2,
  Send,
  SpellCheck,
  AudioLines,
  GraduationCap,
  Mic,
  BookOpen,
  Library,
  HeartHandshake,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn, hskLevelLabel, hskBadgeClass } from "@/lib/utils";
import {
  avatarColor,
  avatarInitial,
  type ForumThread,
  type ForumReply,
  type ForumCategoryMeta,
  type ForumStats,
} from "@/lib/community-forum";

const CAT_ICON: Record<string, LucideIcon> = {
  grammar: SpellCheck,
  pronunciation: AudioLines,
  exam: GraduationCap,
  hskk: Mic,
  vocab: BookOpen,
  resources: Library,
  motivation: HeartHandshake,
  general: MessagesSquare,
};

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center rounded-full font-bold", avatarColor(name))}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden
    >
      {avatarInitial(name)}
    </div>
  );
}

function StatBox({ icon, value, label, live }: { icon: ReactNode; value: string; label: string; live?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5 text-base font-extrabold tabular-nums">
          {value}
          {live && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Reply({ reply }: { reply: ForumReply }) {
  return (
    <div className="flex gap-2.5">
      <Avatar name={reply.author} size={30} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">{reply.author}</span>
            <span className="text-[10px] text-muted-foreground">{reply.time}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">{reply.text}</p>
        </div>
        <div className="mt-1 flex items-center gap-1 pl-3 text-[11px] text-muted-foreground">
          <Heart className="h-3 w-3" /> {reply.likes}
        </div>
      </div>
    </div>
  );
}

function ThreadRow({
  thread,
  extraReplies,
  liked,
  expanded,
  onToggleLike,
  onToggleExpand,
  onReply,
}: {
  thread: ForumThread;
  extraReplies: ForumReply[];
  liked: boolean;
  expanded: boolean;
  onToggleLike: () => void;
  onToggleExpand: () => void;
  onReply: (text: string) => void;
}) {
  const [replyText, setReplyText] = useState("");
  const Icon = CAT_ICON[thread.category] ?? MessageCircle;
  const replies = [...thread.replies, ...extraReplies];
  const replyTotal = thread.replyCount + extraReplies.length;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors hover:border-primary/30",
        thread.pinned && "border-amber-200 bg-amber-50/40 dark:border-amber-400/25 dark:bg-amber-500/5",
      )}
    >
      <div className="flex gap-3">
        <Avatar name={thread.author} />
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-bold text-foreground">{thread.author}</span>
            <span>·</span>
            <span>{thread.time}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium">
              <Icon className="h-3 w-3" /> {thread.categoryLabel}
            </span>
            {thread.hsk && (
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", hskBadgeClass(thread.hsk))}>
                {hskLevelLabel(thread.hsk)}
              </span>
            )}
          </div>

          {/* Title + badges */}
          <button onClick={onToggleExpand} className="mt-1 block text-left">
            <h3 className="text-[15px] font-bold leading-snug hover:text-primary">
              {thread.pinned && <Pin className="mr-1 inline h-3.5 w-3.5 text-amber-500" />}
              {thread.title}
            </h3>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {thread.hot && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
                <Flame className="h-3 w-3" /> Sôi nổi
              </span>
            )}
            {thread.solved && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Đã giải đáp
              </span>
            )}
            {thread.tag && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                #{thread.tag}
              </span>
            )}
          </div>

          {/* Body */}
          <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90", !expanded && "line-clamp-2")}>
            {thread.body}
          </p>

          {/* Footer actions */}
          <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
            <button
              onClick={onToggleLike}
              className={cn("inline-flex items-center gap-1 transition-colors hover:text-rose-500", liked && "text-rose-500")}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} /> {thread.likes + (liked ? 1 : 0)}
            </button>
            <button onClick={onToggleExpand} className="inline-flex items-center gap-1 transition-colors hover:text-primary">
              <MessageCircle className="h-4 w-4" /> {replyTotal}
            </button>
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" /> {thread.views.toLocaleString("vi-VN")}
            </span>
          </div>

          {/* Expanded: replies + composer */}
          {expanded && (
            <div className="mt-3 space-y-3 border-t pt-3">
              {replies.map((r, i) => (
                <Reply key={i} reply={r} />
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const t = replyText.trim();
                  if (!t) return;
                  onReply(t);
                  setReplyText("");
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Viết phản hồi thân thiện…"
                  className="h-9 flex-1 rounded-full border bg-background px-4 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                  disabled={!replyText.trim()}
                  aria-label="Gửi phản hồi"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export function ForumFeed({
  threads,
  categories,
  stats,
  me,
}: {
  threads: ForumThread[];
  categories: ForumCategoryMeta[];
  stats: ForumStats;
  me: string;
}) {
  const [online, setOnline] = useState(stats.online);
  const [activeCat, setActiveCat] = useState("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(8);
  const [localThreads, setLocalThreads] = useState<ForumThread[]>([]);
  const [replyMap, setReplyMap] = useState<Record<string, ForumReply[]>>({});
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [composerOpen, setComposerOpen] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [postCat, setPostCat] = useState(categories[0]?.key ?? "general");

  // Số người "đang online" nhích nhẹ cho có nhịp sống (chỉ chạy phía client).
  useEffect(() => {
    const id = setInterval(() => {
      setOnline((n) => {
        const delta = Math.floor(Math.random() * 7) - 3; // -3..+3
        return Math.min(stats.online + 34, Math.max(stats.online - 20, n + delta));
      });
    }, 4500);
    return () => clearInterval(id);
  }, [stats.online]);

  const allThreads = useMemo(() => [...localThreads, ...threads], [localThreads, threads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allThreads.filter((t) => {
      if (activeCat !== "all" && t.category !== activeCat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.author.toLowerCase().includes(q) ||
        t.tag.toLowerCase().includes(q)
      );
    });
  }, [allThreads, activeCat, query]);

  const shown = filtered.slice(0, visible);

  const submitPost = (e: FormEvent) => {
    e.preventDefault();
    const title = postTitle.trim();
    const body = postBody.trim();
    if (title.length < 5) {
      toast.error("Tiêu đề hơi ngắn — viết rõ hơn một chút nhé.");
      return;
    }
    const cat = categories.find((c) => c.key === postCat);
    const nt: ForumThread = {
      id: `me-${localThreads.length}-${title.length}`,
      author: me,
      title,
      body: body || title,
      hsk: "",
      tag: "Mới",
      likes: 0,
      views: 1,
      time: "Vừa xong",
      solved: false,
      hot: false,
      replies: [],
      category: cat?.key ?? "general",
      categoryLabel: cat?.label ?? "Hỏi đáp chung",
      pinned: false,
      replyCount: 0,
    };
    setLocalThreads((prev) => [nt, ...prev]);
    setPostTitle("");
    setPostBody("");
    setComposerOpen(false);
    setActiveCat("all");
    setExpanded((prev) => new Set(prev).add(nt.id));
    toast.success("Đã đăng bài! Cảm ơn bạn đã chia sẻ 🎉");
  };

  const toggleLike = (id: string) =>
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addReply = (id: string, text: string) => {
    setReplyMap((prev) => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { author: me, text, time: "Vừa xong", likes: 0 }],
    }));
  };

  const chips = [{ key: "all", label: "Tất cả", count: allThreads.length }, ...categories];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatBox icon={<Users className="h-4 w-4" />} value={stats.members.toLocaleString("vi-VN")} label="Thành viên" />
        <StatBox icon={<Flame className="h-4 w-4" />} value={online.toLocaleString("vi-VN")} label="Đang online" live />
        <StatBox icon={<MessagesSquare className="h-4 w-4" />} value={stats.threads.toLocaleString("vi-VN")} label="Chủ đề" />
        <StatBox icon={<MessageCircle className="h-4 w-4" />} value={stats.posts.toLocaleString("vi-VN")} label="Bài viết" />
      </div>

      {/* Composer */}
      <div className="rounded-2xl border bg-card p-3">
        {!composerOpen ? (
          <button
            onClick={() => setComposerOpen(true)}
            className="flex w-full items-center gap-3 text-left"
          >
            <Avatar name={me} />
            <span className="flex-1 rounded-full bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              Bạn đang thắc mắc điều gì? Đặt câu hỏi cho cộng đồng…
            </span>
          </button>
        ) : (
          <form onSubmit={submitPost} className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Avatar name={me} />
              <input
                autoFocus
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Tiêu đề — bạn muốn hỏi/chia sẻ điều gì?"
                className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm font-medium outline-none focus:border-primary"
              />
            </div>
            <textarea
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
              rows={3}
              placeholder="Mô tả chi tiết (thêm ví dụ chữ Hán + pinyin nếu có) để mọi người dễ giúp bạn…"
              className="w-full rounded-lg border bg-background p-3 text-sm outline-none focus:border-primary"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={postCat}
                onChange={(e) => setPostCat(e.target.value)}
                className="h-9 rounded-lg border bg-background px-2 text-sm outline-none focus:border-primary"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" /> Đăng bài
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Search + category chips */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(8);
            }}
            placeholder="Tìm chủ đề, từ khoá, người đăng…"
            className="h-10 w-full rounded-full border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((c) => {
            const active = activeCat === c.key;
            return (
              <button
                key={c.key}
                onClick={() => {
                  setActiveCat(c.key);
                  setVisible(8);
                }}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {c.label}
                <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-white/20" : "bg-muted")}>{c.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Threads */}
      <div className="space-y-3">
        {shown.map((t) => (
          <ThreadRow
            key={t.id}
            thread={t}
            extraReplies={replyMap[t.id] ?? []}
            liked={liked.has(t.id)}
            expanded={expanded.has(t.id)}
            onToggleLike={() => toggleLike(t.id)}
            onToggleExpand={() => toggleExpand(t.id)}
            onReply={(text) => addReply(t.id, text)}
          />
        ))}
        {shown.length === 0 && (
          <p className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            Không tìm thấy chủ đề phù hợp. Thử từ khoá khác hoặc là người đầu tiên đăng nhé!
          </p>
        )}
      </div>

      {visible < filtered.length && (
        <button
          onClick={() => setVisible((v) => v + 8)}
          className="w-full rounded-xl border bg-card py-3 text-sm font-semibold text-primary transition-colors hover:bg-muted"
        >
          Xem thêm chủ đề ({filtered.length - visible})
        </button>
      )}
    </div>
  );
}
