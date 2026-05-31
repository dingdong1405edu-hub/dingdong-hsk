import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { HeartBar } from "@/components/learn/heart-bar";
import { XPBar } from "@/components/learn/xp-bar";
import { StreakFlame } from "@/components/learn/streak-flame";
import { ModuleCard } from "@/components/learn/module-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";

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

  const vocabCount = await db.vocabLesson.count({ where: { unit: { hskLevel: user.hskLevel } } });
  const grammarCount = await db.grammarLesson.count({ where: { unit: { hskLevel: user.hskLevel } } });
  const hanziCount = await db.hanziCharacter.count({ where: { hskLevel: user.hskLevel } });

  const vocabProgress = vocabCount > 0 ? Math.round((user.vocabProgress.length / vocabCount) * 100) : 0;
  const grammarProgress = grammarCount > 0 ? Math.round((user.grammarProgress.length / grammarCount) * 100) : 0;
  const hanziProgress = hanziCount > 0 ? Math.round((user.hanziProgress.length / hanziCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Xin chào, {user.name?.split(" ").pop() ?? "bạn"} 👋</h1>
          <p className="text-muted-foreground text-sm">Tiếp tục hành trình học tiếng Trung của bạn</p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1 font-semibold">
          {hskLevelLabel(user.hskLevel)}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <StreakFlame streak={user.streakDays} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Tim</span>
            </div>
            <HeartBar hearts={user.hearts} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <XPBar xp={user.xp} />
          </CardContent>
        </Card>
      </div>

      {/* Module grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Các module luyện tập</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ModuleCard
            href="/vocab"
            icon="📚"
            title="Từ vựng"
            subtitle={`HSK 1-6 • Duolingo-style`}
            progress={vocabProgress}
            color="bg-blue-100"
          />
          <ModuleCard
            href="/grammar"
            icon="📝"
            title="Ngữ pháp"
            subtitle="Cấu trúc câu, fill-in-blank"
            progress={grammarProgress}
            color="bg-green-100"
          />
          <ModuleCard
            href="/hanzi"
            icon="✍️"
            title="Chữ Hán"
            subtitle="Stroke order + quiz"
            progress={hanziProgress}
            color="bg-purple-100"
          />
          <ModuleCard
            href="/reading"
            icon="📖"
            title="Đọc hiểu"
            subtitle="Đoạn văn + câu hỏi"
            color="bg-amber-100"
          />
          <ModuleCard
            href="/listening"
            icon="🎧"
            title="Nghe hiểu"
            subtitle="Audio + câu hỏi HSK"
            color="bg-teal-100"
          />
          <ModuleCard
            href="/writing"
            icon="🖊️"
            title="Viết luận"
            subtitle="AI chấm ngữ pháp + từ vựng"
            color="bg-rose-100"
          />
          <ModuleCard
            href="/speaking"
            icon="🎤"
            title="Luyện nói"
            subtitle="HSKK format • AI chấm phát âm"
            color="bg-indigo-100"
          />
        </div>
      </div>

      {/* Recent activity */}
      {user.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {user.attempts.map((attempt) => (
                <div key={attempt.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-muted-foreground">{attempt.skill.toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.score !== null && (
                      <span className="font-semibold">{Math.round(attempt.score)}%</span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {new Date(attempt.createdAt).toLocaleDateString("vi")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
