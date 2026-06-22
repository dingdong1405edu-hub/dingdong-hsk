import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Repeat, ArrowRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";

export default async function GrammarReviewHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const units = await db.grammarUnit.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        include: { progress: { where: { userId: session.user.id, completed: true } } },
      },
    },
  });

  // Decorate each unit with its completion %, then group by HSK level.
  const withStats = units.map((u) => {
    const total = u.lessons.length;
    const done = u.lessons.filter((l) => l.progress.length > 0).length;
    return { ...u, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const levels = Array.from(new Set(withStats.map((u) => u.hskLevel)));
  const groups = levels.map((level) => {
    const items = withStats.filter((u) => u.hskLevel === level);
    const total = items.reduce((n, u) => n + u.total, 0);
    const done = items.reduce((n, u) => n + u.done, 0);
    return { level, items, pct: total > 0 ? Math.round((done / total) * 100) : 0, hasContent: total > 0 };
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 sm:p-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Repeat className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">
              Ôn <span className="text-violet-600">ngữ pháp</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Tổng hợp flashcard &amp; minigame của tất cả bài để ôn tập một thể — theo từng unit
              hoặc cả cấp HSK.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-black/[0.04]">
          复
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
          <Repeat className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Chưa có nội dung ngữ pháp để ôn.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <Card key={g.level}>
              <CardContent className="space-y-4 p-5">
                {/* Level header + "review whole level" */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{hskLevelLabel(g.level)}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {g.items.length} unit · hoàn thành {g.pct}%
                    </span>
                  </div>
                  {g.hasContent && (
                    <Link href={`/grammar/review/level/${g.level}`} className="shrink-0">
                      <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                        <Layers className="h-4 w-4" /> Ôn cả cấp
                      </Button>
                    </Link>
                  )}
                </div>
                <Progress value={g.pct} className="h-2" />

                {/* Units in this level */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {g.items.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{u.title}</div>
                        <div className="font-chinese text-xs text-muted-foreground">{u.titleZh}</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={u.pct} className="h-1.5 w-24" />
                          <span className="text-xs text-muted-foreground">{u.pct}%</span>
                        </div>
                      </div>
                      <Link href={`/grammar/review/unit/${u.id}`} className="shrink-0">
                        <Button size="sm" variant="outline" className="gap-1.5">
                          Ôn tập <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
