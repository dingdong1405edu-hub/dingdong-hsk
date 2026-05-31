import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hskLevelLabel } from "@/lib/utils";
import { Clock, BookOpen } from "lucide-react";

export default async function ReadingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tests = await db.readingTest.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
    include: { questions: true },
  });

  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
    select: { refId: true, score: true },
  });
  const attemptMap = new Map(attempts.map((a) => [a.refId, a.score]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Đọc hiểu</h1>
      {tests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có bài đọc nào. Admin sẽ thêm bài sớm!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => {
            const score = attemptMap.get(test.id);
            return (
              <Card key={test.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{test.title}</h3>
                      <span className="font-chinese text-muted-foreground text-sm">{test.titleZh}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Badge variant="outline" className="text-xs">{hskLevelLabel(test.hskLevel)}</Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(test.timeLimit / 60)} phút
                      </span>
                      <span>{test.questions.length} câu hỏi</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {score !== undefined && score !== null && (
                      <span className="text-sm font-semibold text-muted-foreground">
                        Điểm: {Math.round(score)}%
                      </span>
                    )}
                    <Link href={`/reading/${test.id}`}>
                      <Button size="sm">{score !== undefined ? "Làm lại" : "Bắt đầu"}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
