import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { hskLevelLabel } from "@/lib/utils";
import { grammarItemCount } from "@/lib/grammar";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { GrammarAuthorGuide } from "@/components/admin/grammar-author-guide";
import { deleteLessonAction } from "@/server/actions/admin";

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function AdminGrammarUnitPage({ params }: Props) {
  const { unitId } = await params;
  const unit = await db.grammarUnit.findUnique({
    where: { id: unitId },
    include: { lessons: { orderBy: { order: "asc" } } },
  });
  if (!unit) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/grammar"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách unit ngữ pháp
      </Link>

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{unit.title}</h1>
          <span className="font-chinese text-muted-foreground">{unit.titleZh}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <Badge variant="outline">{hskLevelLabel(unit.hskLevel)}</Badge>
          <span className="text-xs text-muted-foreground">{unit.lessons.length} bài học</span>
        </div>
      </div>

      {/* Authoring guide */}
      <GrammarAuthorGuide />

      {/* Create lesson */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LessonEditor skill="grammar" unitId={unitId} />
        </CardContent>
      </Card>

      {/* Existing lessons */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Bài học trong unit</h2>
        {unit.lessons.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Chưa có bài học nào. Dùng form bên trên để tạo bài đầu tiên.
          </p>
        ) : (
          unit.lessons.map((lesson, idx) => (
            <Card key={lesson.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-medium">{lesson.title || `Bài ${idx + 1}`}</div>
                      <div className="text-xs text-muted-foreground">
                        {grammarItemCount(lesson.exercises)} bài tập
                      </div>
                    </div>
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await deleteLessonAction("grammar", lesson.id, unitId);
                    }}
                  >
                    <Button size="sm" variant="destructive" type="submit">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </form>
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    Sửa nội dung bài học
                  </summary>
                  <div className="mt-3 border-t pt-3">
                    <LessonEditor
                      skill="grammar"
                      unitId={unitId}
                      lesson={{ id: lesson.id, title: lesson.title, exercises: lesson.exercises }}
                    />
                  </div>
                </details>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
