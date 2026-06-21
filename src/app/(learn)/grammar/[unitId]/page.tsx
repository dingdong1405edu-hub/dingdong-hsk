import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { grammarItemCount } from "@/lib/grammar";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function GrammarUnitPage({ params }: Props) {
  const { unitId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unit = await db.grammarUnit.findUnique({
    where: { id: unitId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { progress: { where: { userId: session.user.id } } },
      },
    },
  });
  if (!unit) notFound();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="font-chinese text-muted-foreground">{unit.titleZh}</p>
      </div>
      <div className="space-y-3">
        {unit.lessons.map((lesson, idx) => {
          const done = lesson.progress.length > 0 && lesson.progress[0].completed;
          const prevDone = idx === 0 || (unit.lessons[idx - 1].progress.length > 0 && unit.lessons[idx - 1].progress[0].completed);
          const available = idx === 0 || prevDone;
          return (
            <Card key={lesson.id} className={!available ? "opacity-50" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${done ? "bg-green-100 text-green-600" : "bg-primary/10 text-primary"}`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{lesson.title || `Bài ${idx + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {grammarItemCount(lesson.exercises)} bài tập
                    </div>
                  </div>
                </div>
                {available && (
                  <Link href={`/grammar/${unitId}/lesson/${lesson.id}`}>
                    <Button size="sm" variant={done ? "outline" : "default"}>
                      {done ? "Ôn lại" : "Bắt đầu"}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
