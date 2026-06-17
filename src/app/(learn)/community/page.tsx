import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Users2, Trophy, MessageCircle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hskLevelLabel, cn } from "@/lib/utils";

const MEDAL = ["bg-amber-400 text-amber-950", "bg-zinc-300 text-zinc-700", "bg-orange-300 text-orange-900"];

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const top = await db.user.findMany({
    where: { banned: false },
    orderBy: [{ xp: "desc" }],
    take: 20,
    select: { id: true, name: true, email: true, xp: true, streakDays: true, hskLevel: true },
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Users2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">Cộng đồng DingDong</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Học cùng nhau vui hơn — thi đua bảng xếp hạng và sớm có diễn đàn trao đổi.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-black/[0.04]">
          友
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Leaderboard */}
        <Card className="lg:col-span-2">
          <CardHeader>
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
                  <div
                    key={u.id}
                    className={cn("flex items-center gap-3 px-4 py-3", isMe && "bg-primary/5")}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        i < 3 ? MEDAL[i] : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {display.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {display} {isMe && <span className="text-xs font-normal text-primary">(Bạn)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
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

        {/* Coming soon */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-5 w-5 text-sky-500" /> Diễn đàn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-dashed bg-muted/30 p-5 text-center">
                <Sparkles className="mx-auto mb-2 h-7 w-7 text-primary/60" />
                <p className="text-sm font-medium">Sắp ra mắt</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Đặt câu hỏi, chia sẻ mẹo học và kết bạn cùng tiến.
                </p>
              </div>
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
