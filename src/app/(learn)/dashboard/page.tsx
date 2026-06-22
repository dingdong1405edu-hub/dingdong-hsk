import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ModuleCard } from "@/components/learn/module-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, hskLevelLabel, xpToLevel } from "@/lib/utils";
import Link from "next/link";
import { Flame, Heart, Star, Trophy, GraduationCap, Route, ArrowRight, Sparkles, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Ambient } from "@/components/motion/ambient";
import { BaoBuddy } from "@/components/marketing/bao-buddy";

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  suffix,
  prefix,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: number | string;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted", iconClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight">
            {prefix && <span className="mr-1 text-sm font-medium text-muted-foreground">{prefix}</span>}
            {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
            {suffix && <span className="ml-1 text-xs font-normal text-muted-foreground">{suffix}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      attempts: { orderBy: { createdAt: "desc" }, take: 5 },
      vocabProgress: { where: { completed: true } },
      grammarProgress: { where: { completed: true } },
      hanziProgress: { where: { mastered: true } },
    },
  });
  if (!user) redirect("/login");

  // Chỉ đếm nội dung đã xuất bản (bỏ bản nháp) để % tiến độ khớp những gì học viên thấy.
  const vocabCount = await db.vocabLesson.count({
    where: { published: true, unit: { published: true, hskLevel: user.hskLevel } },
  });
  const grammarCount = await db.grammarLesson.count({
    where: { published: true, unit: { published: true, hskLevel: user.hskLevel } },
  });
  const hanziCount = await db.hanziCharacter.count({
    where: { published: true, hskLevel: user.hskLevel },
  });

  const vocabProgress = vocabCount > 0 ? Math.round((user.vocabProgress.length / vocabCount) * 100) : 0;
  const grammarProgress = grammarCount > 0 ? Math.round((user.grammarProgress.length / grammarCount) * 100) : 0;
  const hanziProgress = hanziCount > 0 ? Math.round((user.hanziProgress.length / hanziCount) * 100) : 0;
  const { level } = xpToLevel(user.xp);
  const firstName = user.name?.split(" ").pop() ?? "bạn";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-green-700 p-6 text-primary-foreground shadow-soft-lg sm:p-8">
        <Ambient variant="calm" className="opacity-50" />
        <div className="relative z-10 max-w-xl">
          <h1 className="text-2xl font-bold sm:text-3xl">Xin chào, {firstName} 👋</h1>
          <p className="mt-1.5 text-sm text-primary-foreground/85">
            Tiếp tục hành trình chinh phục tiếng Trung của bạn hôm nay.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur">
            <GraduationCap className="h-4 w-4" />
            Mục tiêu: {hskLevelLabel(user.hskLevel)}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-4 -top-10 select-none font-chinese text-[140px] leading-none opacity-15">
          中
        </div>
        <BaoBuddy
          size={88}
          pose="idle"
          className="pointer-events-none absolute bottom-2 right-4 z-10 hidden sm:block"
        />
      </div>

      {/* Featured: Học theo lộ trình */}
      <Link href="/roadmap" className="group block">
        <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg sm:p-6">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft">
                <Route className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold sm:text-xl">Học theo lộ trình</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                    <Sparkles className="h-3 w-3" /> Mới
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Bản đồ học HSK 1–6 kiểu phiêu lưu — từ vựng, ngữ pháp, nghe, nói, đọc, viết trong từng bài.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-soft transition-transform group-hover:translate-x-0.5 sm:self-auto">
              Khám phá <ArrowRight className="h-4 w-4" />
            </span>
          </div>
          <div className="pointer-events-none absolute -right-3 -top-6 select-none font-chinese text-[110px] leading-none text-emerald-600/10">
            道
          </div>
        </div>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Flame} iconClass="text-orange-500" label="Chuỗi ngày" value={user.streakDays} suffix="ngày" />
        <StatCard icon={Heart} iconClass="text-rose-500" label="Tim" value={user.hearts} suffix="/ 5" />
        <StatCard icon={Star} iconClass="text-amber-500" label="Kinh nghiệm" value={user.xp} suffix="XP" />
        <StatCard icon={Trophy} iconClass="text-violet-500" label="Cấp độ" value={level} prefix="Cấp" />
      </div>

      {/* Modules */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Các module luyện tập</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <ModuleCard href="/vocab" icon="📚" title="Từ vựng" subtitle="HSK 1-6 • Duolingo-style" progress={vocabProgress} color="bg-blue-100" />
          <ModuleCard href="/grammar" icon="📝" title="Ngữ pháp" subtitle="Cấu trúc câu, điền từ" progress={grammarProgress} color="bg-green-100" />
          <ModuleCard href="/hanzi" icon="✍️" title="Chữ Hán" subtitle="Thứ tự nét + quiz" progress={hanziProgress} color="bg-purple-100" />
          <ModuleCard href="/reading" icon="📖" title="Đọc hiểu" subtitle="Đoạn văn + câu hỏi" color="bg-amber-100" />
          <ModuleCard href="/listening" icon="🎧" title="Nghe hiểu" subtitle="Audio + câu hỏi HSK" color="bg-teal-100" />
          <ModuleCard href="/writing" icon="🖊️" title="Viết luận" subtitle="AI chấm ngữ pháp & từ vựng" color="bg-rose-100" />
          <ModuleCard href="/speaking" icon="🎤" title="Luyện nói" subtitle="HSKK • AI chấm phát âm" color="bg-indigo-100" />
        </div>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {user.attempts.length > 0 ? (
            <div className="divide-y">
              {user.attempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                  <span className="font-medium capitalize">{attempt.skill.toLowerCase()}</span>
                  <div className="flex items-center gap-3">
                    {attempt.score !== null && (
                      <span className="font-semibold">{Math.round(attempt.score)}%</span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(attempt.createdAt).toLocaleDateString("vi")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <BaoBuddy size={72} pose="idle" className="mx-auto mb-3" />
              Chưa có hoạt động nào. Hãy bắt đầu một bài học để ghi lại tiến độ! 🚀
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
