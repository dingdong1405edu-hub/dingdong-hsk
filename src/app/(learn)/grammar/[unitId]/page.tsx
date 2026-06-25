import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Repeat, BookOpen, FileDown, Lock, ClipboardCheck } from "lucide-react";
import { grammarItemCount, grammarTestCount } from "@/lib/grammar";

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
        where: { published: true }, // ẩn bài nháp khỏi học viên
        orderBy: { order: "asc" },
        include: { progress: { where: { userId: session.user.id } } },
      },
    },
  });
  if (!unit || !unit.published) notFound(); // ẩn unit nháp khỏi học viên

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{unit.title}</h1>
          <p className="font-chinese text-muted-foreground">{unit.titleZh}</p>
        </div>
        <Link href={`/grammar/${unitId}/review`} className="shrink-0">
          <Button variant="outline" size="sm" className="gap-1.5 border-violet-300 text-violet-700 dark:border-violet-400/25 dark:text-violet-300">
            <Repeat className="h-4 w-4" /> Ôn cả unit
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {unit.lessons.map((lesson, idx) => {
          const started = lesson.progress.length > 0;
          const done = started && lesson.progress[0].completed;
          const prevDone =
            idx === 0 ||
            (unit.lessons[idx - 1].progress.length > 0 && unit.lessons[idx - 1].progress[0].completed);
          const available = idx === 0 || prevDone;
          // "Học" label: Bắt đầu (mới) · Học tiếp (đang dở) · Học lại (đã xong).
          const studyLabel = done ? "Học lại" : started ? "Học tiếp" : "Bắt đầu";
          const base = `/grammar/${unitId}/lesson/${lesson.id}`;
          const hasTest = grammarTestCount(lesson.exercises) > 0;
          return (
            <Card key={lesson.id} className={!available ? "opacity-60" : ""}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${
                      done
                        ? "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-300"
                        : available
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="h-5 w-5" /> : available ? idx + 1 : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{lesson.title || `Bài ${idx + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {grammarItemCount(lesson.exercises)} bài tập
                    </div>
                  </div>
                </div>

                {available ? (
                  <div className="flex flex-wrap gap-2">
                    <Link href={base}>
                      <Button size="sm" variant={done ? "outline" : "default"} className="gap-1.5">
                        <BookOpen className="h-4 w-4" /> {studyLabel}
                      </Button>
                    </Link>
                    <Link href={`${base}/review`}>
                      <Button size="sm" variant="outline" className="gap-1.5 border-violet-300 text-violet-700 dark:border-violet-400/25 dark:text-violet-300">
                        <Repeat className="h-4 w-4" /> Ôn tập
                      </Button>
                    </Link>
                    {hasTest && (
                      <Link href={`${base}/test`}>
                        <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 text-amber-700 dark:border-amber-400/25 dark:text-amber-300">
                          <ClipboardCheck className="h-4 w-4" /> Kiểm tra
                        </Button>
                      </Link>
                    )}
                    <Link href={`/grammar-pdf/${unitId}/${lesson.id}`}>
                      <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                        <FileDown className="h-4 w-4" /> Tải PDF
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Hoàn thành bài trước để mở khoá.</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
