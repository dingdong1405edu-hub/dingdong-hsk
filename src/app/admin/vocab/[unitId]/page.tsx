import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { hskLevelLabel } from "@/lib/utils";
import { LessonEditor } from "@/components/admin/lesson-editor";
import { VocabWordEditor } from "@/components/admin/vocab-word-editor";
import { ImageUpload } from "@/components/admin/image-upload";
import { deleteLessonAction } from "@/server/actions/admin";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList, type ReorderItem } from "@/components/admin/reorder-list";
import type { VocabWordCard, WordExample } from "@/types";

async function createVocabLessonAction(fd: FormData) {
  "use server";
  await requireAdmin();
  const unitId = fd.get("unitId") as string;
  const title = ((fd.get("title") as string) || "").trim();
  const count = await db.vocabLesson.count({ where: { unitId } });
  await db.vocabLesson.create({
    data: { unitId, title, order: count + 1, exercises: [] as Prisma.InputJsonValue, published: false },
  });
  revalidatePath(`/admin/vocab/${unitId}`);
}

async function updateUnitImageAction(fd: FormData) {
  "use server";
  await requireAdmin();
  const unitId = fd.get("unitId") as string;
  const imageUrl = ((fd.get("imageUrl") as string) || "").trim();
  await db.vocabUnit.update({
    where: { id: unitId },
    data: { imageUrl: imageUrl || null },
  });
  revalidatePath(`/admin/vocab/${unitId}`);
  revalidatePath("/admin/vocab");
}

interface Props {
  params: Promise<{ unitId: string }>;
}

export default async function AdminVocabUnitPage({ params }: Props) {
  const { unitId } = await params;
  const unit = await db.vocabUnit.findUnique({
    where: { id: unitId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { words: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!unit) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/vocab"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách unit từ vựng
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

      {/* Unit cover image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ảnh đại diện của unit</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateUnitImageAction} className="space-y-3">
            <input type="hidden" name="unitId" value={unitId} />
            <ImageUpload name="imageUrl" defaultValue={unit.imageUrl} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">
                Tải ảnh từ máy lên (kéo–thả hoặc bấm chọn). Ảnh hiển thị trên thẻ unit ở trang Từ vựng.
              </p>
              <Button type="submit" size="sm">
                Lưu ảnh
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Create lesson */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createVocabLessonAction} className="flex items-end gap-2">
            <input type="hidden" name="unitId" value={unitId} />
            <div className="flex-1 space-y-1">
              <Label>Tên bài học</Label>
              <Input name="title" placeholder="VD: Chào hỏi cơ bản" />
            </div>
            <Button type="submit">Tạo bài</Button>
          </form>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Tạo bài rồi thêm từng từ vựng (chữ Hán, pinyin, nghĩa, ví dụ) ở danh sách bên dưới.
            Bài mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.
          </p>
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
          <ReorderList
            spec={{ kind: "lessons", skill: "vocab", unitId }}
            items={unit.lessons.map<ReorderItem>((lesson, idx) => {
              const words: VocabWordCard[] = lesson.words.map((w) => ({
                id: w.id,
                lessonId: w.lessonId,
                order: w.order,
                hanzi: w.hanzi,
                pinyin: w.pinyin,
                meaning: w.meaning,
                examples: Array.isArray(w.examples) ? (w.examples as unknown as WordExample[]) : [],
                audioUrl: w.audioUrl,
              }));
              return {
                id: lesson.id,
                content: (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-medium">{lesson.title || `Bài ${idx + 1}`}</div>
                            <div className="text-xs text-muted-foreground">{words.length} từ vựng</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <PublishToggle model="vocabLesson" id={lesson.id} published={lesson.published} />
                          <form
                            action={async () => {
                              "use server";
                              await deleteLessonAction("vocab", lesson.id, unitId);
                            }}
                          >
                            <Button size="sm" variant="destructive" type="submit">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
                      </div>

                      {/* Primary: per-word content for the learner flow */}
                      <div className="mt-3 border-t pt-3">
                        <VocabWordEditor lessonId={lesson.id} unitId={unitId} words={words} />
                      </div>

                      {/* Advanced: legacy JSON drills (not shown in the vocab learner flow) */}
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                          Nâng cao: bài tập JSON (Duolingo)
                        </summary>
                        <div className="mt-3 border-t pt-3">
                          <LessonEditor
                            skill="vocab"
                            unitId={unitId}
                            lesson={{ id: lesson.id, title: lesson.title, exercises: lesson.exercises }}
                          />
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ),
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
