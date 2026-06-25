import { db } from "@/lib/db";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList, type ReorderItem } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { SKILL_META } from "@/lib/roadmap";
import {
  createRoadmapLessonAction,
  updateCourseAction,
  deleteRoadmapLessonAction,
  createRoadmapChapterAction,
  updateRoadmapChapterAction,
  deleteRoadmapChapterAction,
} from "@/server/actions/roadmap-admin";
import { ArrowLeft, Plus, Trash2, ChevronRight, Save, Layers } from "lucide-react";

interface Props {
  params: Promise<{ courseId: string }>;
}

export default async function AdminCoursePage({ params }: Props) {
  const { courseId } = await params;
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { order: "asc" },
        include: { sections: { select: { skill: true, published: true } } },
      },
      chapters: {
        orderBy: { order: "asc" },
        include: { _count: { select: { lessons: true } } },
      },
    },
  });
  if (!course) notFound();

  const TOTAL_SKILLS = SKILL_META.length;

  return (
    <div className="space-y-6">
      <Link href="/admin/roadmap" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách khóa
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <Badge variant="outline">{hskLevelLabel(course.hskLevel)}</Badge>
      </div>

      {/* Sửa thông tin khóa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4" /> Thông tin khóa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateCourseAction(fd);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={course.id} />
            <div className="space-y-1">
              <Label>Tiêu đề (VI)</Label>
              <Input name="title" defaultValue={course.title} required />
            </div>
            <div className="space-y-1">
              <Label>Tiêu đề (ZH)</Label>
              <Input name="titleZh" className="font-chinese" defaultValue={course.titleZh} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Mô tả</Label>
              <Textarea name="description" defaultValue={course.description ?? ""} className="min-h-16" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Ảnh đại diện khóa</Label>
              <ImageUpload name="imageUrl" defaultValue={course.imageUrl ?? undefined} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Lưu thông tin khóa</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quản lý chương trong khóa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Chương trong khóa ({course.chapters.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="-mt-2 text-sm text-muted-foreground">
            Tạo các chương trước, rồi gán bài vào chương khi thêm bài bên dưới. Kéo–thả để đổi thứ tự chương.
          </p>

          {/* Thêm chương */}
          <form
            action={async (fd: FormData) => {
              "use server";
              await createRoadmapChapterAction(fd);
            }}
            className="grid grid-cols-1 gap-3 rounded-xl border border-dashed p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            <input type="hidden" name="courseId" value={course.id} />
            <div className="space-y-1">
              <Label>Tên chương (VI)</Label>
              <Input name="title" placeholder="Chào hỏi & Làm quen" required />
            </div>
            <div className="space-y-1">
              <Label>Tên chương (ZH)</Label>
              <Input name="titleZh" className="font-chinese" placeholder="问候与认识" />
            </div>
            <Button type="submit" className="sm:mb-0.5">
              <Plus className="h-4 w-4" /> Thêm chương
            </Button>
          </form>

          {/* Danh sách chương (kéo–thả đổi thứ tự, sửa tên, xoá) */}
          {course.chapters.length === 0 ? (
            <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
              Chưa có chương nào. Tạo chương đầu tiên bằng form phía trên.
            </div>
          ) : (
            <ReorderList
              spec={{ kind: "roadmapChapters", courseId: course.id }}
              items={course.chapters.map<ReorderItem>((ch) => ({
                id: ch.id,
                content: (
                  <Card>
                    <CardContent className="space-y-3 p-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="shrink-0">Chương {ch.order}</Badge>
                        <span className="text-xs text-muted-foreground">{ch._count.lessons} bài</span>
                      </div>
                      <form
                        action={async (fd: FormData) => {
                          "use server";
                          await updateRoadmapChapterAction(fd);
                        }}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                      >
                        <input type="hidden" name="id" value={ch.id} />
                        <div className="space-y-1">
                          <Label className="text-xs">Tên chương (VI)</Label>
                          <Input name="title" defaultValue={ch.title} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Tên chương (ZH)</Label>
                          <Input name="titleZh" className="font-chinese" defaultValue={ch.titleZh} />
                        </div>
                        <Button type="submit" size="sm" variant="outline" className="sm:mb-0.5">
                          <Save className="h-4 w-4" /> Lưu
                        </Button>
                      </form>
                      {ch._count.lessons === 0 ? (
                        <form
                          action={async () => {
                            "use server";
                            await deleteRoadmapChapterAction(ch.id);
                          }}
                        >
                          <Button type="submit" size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" /> Xoá chương
                          </Button>
                        </form>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Chương còn bài — chuyển hết bài sang chương khác để xoá được.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ),
              }))}
            />
          )}
        </CardContent>
      </Card>

      {/* Thêm bài */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd: FormData) => {
              "use server";
              const res = await createRoadmapLessonAction(fd);
              if (res.ok && res.data) redirect(`/admin/roadmap/${courseId}/${res.data.id}`);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="courseId" value={course.id} />
            <div className="space-y-1">
              <Label>Tên bài (VI)</Label>
              <Input name="topic" placeholder="Chào hỏi" required />
            </div>
            <div className="space-y-1">
              <Label>Tên bài (ZH)</Label>
              <Input name="topicZh" className="font-chinese" placeholder="问候" />
            </div>
            <div className="space-y-1">
              <Label>Biểu tượng (emoji)</Label>
              <Input name="icon" placeholder="👋" />
            </div>
            <div className="space-y-1">
              <Label>Chương</Label>
              <select
                name="chapterId"
                defaultValue={course.chapters[0]?.id ?? ""}
                disabled={course.chapters.length === 0}
                className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">(Chưa phân chương)</option>
                {course.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Chương {ch.order}. {ch.title}
                  </option>
                ))}
              </select>
              {course.chapters.length === 0 && (
                <p className="text-xs text-muted-foreground">Tạo chương ở phần trên để gán bài vào chương.</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Thưởng XP</Label>
              <Input name="xpReward" type="number" defaultValue="20" min={0} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Mô tả ngắn</Label>
              <Textarea name="description" className="min-h-16" placeholder="Giới thiệu nội dung bài học..." />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Tạo bài &amp; thêm nội dung</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danh sách bài (kéo–thả đổi thứ tự trong khóa) */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Bài học trong khóa ({course.lessons.length})
        </h2>
        {course.lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            Chưa có bài học nào. Dùng form phía trên để thêm bài đầu tiên.
          </div>
        ) : (
          <ReorderList
            spec={{ kind: "roadmapLessons", courseId: course.id }}
            items={course.lessons.map<ReorderItem>((lesson) => {
              const publishedCount = lesson.sections.filter((s) => s.published).length;
              return {
                id: lesson.id,
                content: (
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                          {lesson.icon ?? "📘"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-semibold">
                              Bài {lesson.order}. {lesson.topic}
                            </span>
                            <span className="truncate font-chinese text-sm text-muted-foreground">
                              {lesson.topicZh}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[11px]">
                              Chương {lesson.chapterOrder}
                              {lesson.chapter ? ` · ${lesson.chapter}` : ""}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {publishedCount}/{TOTAL_SKILLS} phần đang hiện
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Link href={`/admin/roadmap/${course.id}/${lesson.id}`}>
                          <Button size="sm" variant="outline">
                            <ChevronRight className="h-4 w-4" /> Nội dung
                          </Button>
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteRoadmapLessonAction(lesson.id);
                          }}
                        >
                          <Button size="sm" variant="destructive" type="submit">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
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
