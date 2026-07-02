import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users2, Trophy, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ForumFeed } from "@/components/learn/community/forum-feed";
import {
  FORUM_THREADS,
  FORUM_CATEGORIES,
  FORUM_STATS,
  topContributors,
  avatarColor,
  avatarInitial,
} from "@/lib/community-forum";
import { hskLevelLabel, cn } from "@/lib/utils";

const MEDAL = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-800 dark:bg-zinc-400/30 dark:text-zinc-100", "bg-orange-300 text-orange-900"];

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const top = await db.user.findMany({
    where: { banned: false },
    orderBy: [{ xp: "desc" }],
    take: 12,
    select: { id: true, name: true, email: true, xp: true, streakDays: true, hskLevel: true },
  });

  const me = session.user.name?.trim() || session.user.email?.split("@")[0] || "Bạn";
  const contributors = topContributors(6);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6 dark:border-green-400/20 dark:from-green-500/10 dark:to-transparent">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Users2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">Cộng đồng DingDong</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Học cùng nhau vui hơn — hỏi đáp, chia sẻ mẹo học và thi đua bảng xếp hạng.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-black/[0.04] dark:text-white/[0.04]">
          友
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Forum */}
        <div className="lg:col-span-2">
          <ForumFeed threads={FORUM_THREADS} categories={FORUM_CATEGORIES} stats={FORUM_STATS} me={me} />
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Leaderboard (dữ liệu thật) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-amber-500" /> Bảng xếp hạng XP
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {top.map((u, i) => {
                  const isMe = u.id === session.user!.id;
                  const display = u.name ?? u.email.split("@")[0];
                  return (
                    <div key={u.id} className={cn("flex items-center gap-3 px-4 py-2.5", isMe && "bg-primary/5")}>
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i < 3 ? MEDAL[i] : "bg-muted text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {display.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">
                          {display} {isMe && <span className="text-xs font-normal text-primary">(Bạn)</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {hskLevelLabel(u.hskLevel)} · 🔥 {u.streakDays} ngày
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-bold text-amber-600">{u.xp} XP</div>
                    </div>
                  );
                })}
                {top.length === 0 && (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chưa có dữ liệu xếp hạng.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thành viên tích cực (từ diễn đàn) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-primary" /> Thành viên tích cực
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {contributors.map((c) => (
                <div key={c.name} className="flex items-center gap-2.5">
                  <div
                    className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", avatarColor(c.name))}
                  >
                    {avatarInitial(c.name)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{c.posts} bài</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 text-center">
              <div className="font-chinese text-3xl text-primary">加油</div>
              <p className="mt-2 text-xs text-muted-foreground">Cố lên! Mỗi ngày một chút, tiến bộ thật nhiều.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
