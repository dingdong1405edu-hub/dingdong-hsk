import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { hskLevelLabel, xpToLevel } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { Target, Flame, Star, CheckCircle2 } from "lucide-react";

const HSK_LEVELS = Object.values(HSKLevel);

const LEVEL_NOTE: Record<string, string> = {
  HSK1: "150 từ · giao tiếp cơ bản hằng ngày",
  HSK2: "300 từ · trao đổi đơn giản, quen thuộc",
  HSK3: "600 từ · giao tiếp trong sinh hoạt, học tập",
  HSK4: "1200 từ · thảo luận nhiều chủ đề",
  HSK5: "2500 từ · đọc báo, xem phim, diễn đạt trôi chảy",
  HSK6: "5000+ từ · gần như người bản ngữ",
};

async function setGoalAction(fd: FormData): Promise<void> {
  "use server";
  const session = await auth();
  if (!session?.user) return;
  const hskLevel = fd.get("hskLevel") as HSKLevel;
  if (!HSK_LEVELS.includes(hskLevel)) return;
  await db.user.update({ where: { id: session.user.id }, data: { hskLevel } });
  revalidatePath("/goals");
  revalidatePath("/dashboard");
}

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { hskLevel: true, xp: true, streakDays: true },
  });
  if (!user) redirect("/login");

  const { level, progress, next } = xpToLevel(user.xp);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Target className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">Mục tiêu học tập</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Chọn cấp độ HSK bạn muốn chinh phục — lộ trình sẽ điều chỉnh theo mục tiêu.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-black/[0.04]">
          标
        </div>
      </div>

      {/* Progress cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 text-amber-500" /> Cấp độ XP
            </div>
            <div className="mt-1 text-2xl font-bold">Cấp {level}</div>
            <Progress value={progress} className="mt-3 h-2" />
            <div className="mt-1 text-xs text-muted-foreground">
              {user.xp} / {next} XP đến cấp tiếp theo
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-orange-500" /> Chuỗi ngày học
            </div>
            <div className="mt-1 text-2xl font-bold">{user.streakDays} ngày</div>
            <p className="mt-3 text-xs text-muted-foreground">
              Học mỗi ngày để giữ chuỗi và lên trình nhanh hơn 🔥
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Choose target */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chọn cấp độ mục tiêu</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={setGoalAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {HSK_LEVELS.map((l) => {
                const selected = l === user.hskLevel;
                return (
                  <label key={l} className="relative block cursor-pointer">
                    <input
                      type="radio"
                      name="hskLevel"
                      value={l}
                      defaultChecked={selected}
                      className="peer sr-only"
                    />
                    <span className="flex flex-col rounded-xl border border-input p-4 transition-colors hover:border-primary/40 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:ring-1 peer-checked:ring-primary/30">
                      <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary opacity-0 transition-opacity peer-checked:opacity-100" />
                      <span className="text-base font-bold">{hskLevelLabel(l)}</span>
                      <span className="mt-1 text-xs text-muted-foreground">{LEVEL_NOTE[l]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <Button type="submit">Lưu mục tiêu</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
