import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hskLevelLabel } from "@/lib/utils";
import { PenLine } from "lucide-react";

export default async function WritingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await db.writingTask.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
  });

  const typeLabel: Record<string, string> = {
    FREE: "Tự do",
    GUIDED: "Có hướng dẫn",
    PICTURE_DESCRIPTION: "Mô tả ảnh",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Luyện viết</h1>
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PenLine className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có bài viết nào.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">{hskLevelLabel(task.hskLevel)}</Badge>
                    <Badge variant="secondary">{typeLabel[task.taskType]}</Badge>
                    <Badge variant="outline" className="text-xs">
                      Tối thiểu {task.minChars} chữ
                    </Badge>
                  </div>
                  <p className="text-sm">{task.prompt}</p>
                  {task.promptZh && (
                    <p className="font-chinese text-sm text-muted-foreground mt-1">{task.promptZh}</p>
                  )}
                </div>
                <Link href={`/writing/${task.id}`}>
                  <Button size="sm">Viết bài</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
