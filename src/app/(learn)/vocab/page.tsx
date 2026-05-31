import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { hskLevelLabel } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { ChevronRight, Lock } from "lucide-react";

const HSK_LEVELS = Object.values(HSKLevel);

export default async function VocabPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { hskLevel: true },
  });
  if (!user) redirect("/login");

  const units = await db.vocabUnit.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        include: {
          progress: { where: { userId: session.user.id, completed: true } },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  const userLevelIndex = HSK_LEVELS.indexOf(user.hskLevel);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Từ vựng HSK</h1>
      {HSK_LEVELS.map((level) => {
        const levelUnits = units.filter((u) => u.hskLevel === level);
        if (levelUnits.length === 0) return null;
        const levelIndex = HSK_LEVELS.indexOf(level);
        const isUnlocked = levelIndex <= userLevelIndex;
        return (
          <div key={level}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">{hskLevelLabel(level)}</h2>
              {!isUnlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              {levelUnits.map((unit) => {
                const total = unit.lessons.length;
                const done = unit.lessons.filter((l) => l.progress.length > 0).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <Card key={unit.id} className={!isUnlocked ? "opacity-50" : "hover:shadow-md transition-shadow"}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{unit.title}</span>
                            <span className="font-chinese text-muted-foreground text-sm">
                              {unit.titleZh}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {done}/{total} bài học
                          </div>
                          <Progress value={pct} className="h-1.5 mt-2 max-w-xs" />
                        </div>
                        {isUnlocked && (
                          <Link href={`/vocab/${unit.id}`}>
                            <ChevronRight className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
