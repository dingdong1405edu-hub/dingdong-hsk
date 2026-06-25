import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { hskLevelLabel } from "@/lib/utils";
import { LEVELS } from "@/lib/roadmap";
import { createCourseForLevelAction } from "@/server/actions/roadmap-admin";
import { ChevronRight, Route, Plus, BookOpen } from "lucide-react";

export default async function AdminRoadmapPage() {
  const courses = await db.course.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { lessons: true } } },
  });
  const byLevel = new Map<string, (typeof courses)[number]>(
    courses.map((c) => [c.hskLevel as string, c])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Route className="h-6 w-6 text-primary" /> Lộ trình học
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          6 khóa HSK, mỗi bài gồm đủ 7 phần: Từ vựng · Ngữ pháp · Chữ Hán · Đọc · Nghe · Viết · Nói.
          Chọn một khóa để thêm và quản lý bài học.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => {
          const course = byLevel.get(level);
          if (!course) {
            return (
              <Card key={level} className="border-dashed">
                <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
                  <Badge variant="outline">{hskLevelLabel(level)}</Badge>
                  <p className="text-sm text-muted-foreground">Chưa có khóa cho cấp này.</p>
                  <form
                    action={async () => {
                      "use server";
                      await createCourseForLevelAction(level);
                    }}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      <Plus className="h-4 w-4" /> Tạo khóa {hskLevelLabel(level)}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            );
          }
          return (
            <Card key={level} className="transition-all hover:border-primary/30 hover:shadow-soft-lg">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{course.title}</div>
                    {course.titleZh && (
                      <div className="truncate font-chinese text-sm text-muted-foreground">{course.titleZh}</div>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">{hskLevelLabel(course.hskLevel)}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5" /> {course._count.lessons} bài học
                </div>
                <div className="flex items-center gap-2">
                  <PublishToggle model="course" id={course.id} published={course.published} />
                  <Link href={`/admin/roadmap/${course.id}`} className="flex-1">
                    <Button size="sm" className="w-full">
                      Quản lý bài <ChevronRight className="h-4 w-4" />
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
