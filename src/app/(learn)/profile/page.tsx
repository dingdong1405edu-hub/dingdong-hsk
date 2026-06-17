import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel, xpToLevel, cn } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { Flame, Heart, Star, Trophy } from "lucide-react";

const HSK_LEVELS = Object.values(HSKLevel);

async function updateProfileAction(fd: FormData): Promise<void> {
  "use server";
  const session = await auth();
  if (!session?.user) return;
  const name = ((fd.get("name") as string) || "").trim() || null;
  const hskLevel = fd.get("hskLevel") as HSKLevel;
  await db.user.update({
    where: { id: session.user.id },
    data: { name, ...(HSK_LEVELS.includes(hskLevel) ? { hskLevel } : {}) },
  });
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      attempts: { orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { vocabProgress: true, grammarProgress: true, hanziProgress: true, attempts: true } },
    },
  });
  if (!user) redirect("/login");

  const { level } = xpToLevel(user.xp);
  const display = user.name ?? user.email.split("@")[0];

  const stats = [
    { icon: Star, cls: "text-amber-500", label: "Kinh nghiệm", value: `${user.xp} XP` },
    { icon: Trophy, cls: "text-violet-500", label: "Cấp độ", value: `Cấp ${level}` },
    { icon: Flame, cls: "text-orange-500", label: "Chuỗi ngày", value: `${user.streakDays}` },
    { icon: Heart, cls: "text-rose-500", label: "Tim", value: `${user.hearts}/5` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-700 p-6 text-primary-foreground">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold backdrop-blur">
            {display.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{display}</h1>
            <p className="text-sm text-primary-foreground/85">{user.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                {user.role === "ADMIN" ? "Quản trị viên" : "Học viên"}
              </Badge>
              <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                Mục tiêu: {hskLevelLabel(user.hskLevel)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 -top-8 select-none font-chinese text-[120px] leading-none opacity-10">
          我
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-muted", s.cls)}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
                <div className="text-lg font-bold leading-tight">{s.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Edit form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin tài khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateProfileAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên hiển thị</Label>
                <Input id="name" name="name" defaultValue={user.name ?? ""} placeholder="Tên của bạn" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hskLevel">Cấp độ mục tiêu</Label>
                <select
                  id="hskLevel"
                  name="hskLevel"
                  defaultValue={user.hskLevel}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  {HSK_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {hskLevelLabel(l)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit">Lưu thay đổi</Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {user.attempts.length > 0 ? (
              <div className="divide-y">
                {user.attempts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="font-medium capitalize">{a.skill.toLowerCase()}</span>
                    <div className="flex items-center gap-3">
                      {a.score !== null && <span className="font-semibold">{Math.round(a.score)}%</span>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString("vi")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có hoạt động nào.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
