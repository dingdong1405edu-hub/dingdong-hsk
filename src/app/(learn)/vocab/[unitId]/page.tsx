import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileDown } from "lucide-react";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function VocabUnitPage({ params }: Props) {
  const { unitId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const unit = await db.vocabUnit.findUnique({
    where: { id: unitId },
    include: {
      lessons: {
        where: { published: true }, // ẩn bài nháp khỏi học viên
        orderBy: { order: "asc" },
        include: {
          progress: { where: { userId: session.user.id } },
          _count: { select: { words: true } },
        },
      },
    },
  });
  if (!unit || !unit.published) notFound(); // ẩn unit nháp khỏi học viên

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{unit.title}</h1>
        <p className="font-chinese text-muted-foreground">{unit.titleZh}</p>
      </div>
      <div className="space-y-3">
        {unit.lessons.map((lesson, idx) => {
          const done = lesson.progress.length > 0 && lesson.progress[0].completed;
          return (
            <Card key={lesson.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${done ? "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-300" : "bg-primary/10 text-primary"}`}>
                    {done ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{lesson.title || `Bài ${idx + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {lesson._count.words} từ vựng
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link href={`/vocab/${unitId}/lesson/${lesson.id}`}>
                    <Button size="sm" variant={done ? "outline" : "default"}>
                      {done ? "Ôn lại" : "Bắt đầu"}
                    </Button>
                  </Link>
                  <Link href={`/vocab-pdf/${unitId}/${lesson.id}`}>
                    <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                      <FileDown className="h-4 w-4" /> PDF
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
