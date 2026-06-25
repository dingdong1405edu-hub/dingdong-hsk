import { db } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { SKILL_META } from "@/lib/roadmap";
import { updateRoadmapLessonAction } from "@/server/actions/roadmap-admin";
import { SectionPanel } from "@/components/admin/roadmap/section-panel";
import { ArrowLeft, Save, Layers } from "lucide-react";

interface Props {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonEditorPage({ params }: Props) {
  const { courseId, lessonId } = await params;
  const lesson = await db.roadmapLesson.findUnique({
    where: { id: lessonId },
    include: { course: true, sections: true },
  });
  if (!lesson || lesson.courseId !== courseId) notFound();

  const bySkill = new Map<string, (typeof lesson.sections)[number]>(
    lesson.sections.map((s) => [s.skill as string, s])
  );

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/roadmap/${courseId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại {lesson.course.title}
      </Link>

      <div className="flex items-center gap-2">
        <span className="text-2xl">{lesson.icon ?? "📘"}</span>
        <h1 className="text-2xl font-bold">
          Bài {lesson.order}. {lesson.topic}
        </h1>
        <Badge variant="outline">{hskLevelLabel(lesson.course.hskLevel)}</Badge>
      </div>

      {/* Sửa thông tin bài */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4" /> Thông tin bài học
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateRoadmapLessonAction(fd);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={lesson.id} />
            <div className="space-y-1">
              <Label>Tên bài (VI)</Label>
              <Input name="topic" defaultValue={lesson.topic} required />
            </div>
            <div className="space-y-1">
              <Label>Tên bài (ZH)</Label>
              <Input name="topicZh" className="font-chinese" defaultValue={lesson.topicZh} />
            </div>
            <div className="space-y-1">
              <Label>Biểu tượng (emoji)</Label>
              <Input name="icon" defaultValue={lesson.icon ?? ""} placeholder="👋" />
            </div>
            <div className="space-y-1">
              <Label>Tên chương</Label>
              <Input name="chapter" defaultValue={lesson.chapter ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Chương số</Label>
              <Input name="chapterOrder" type="number" min={1} defaultValue={lesson.chapterOrder} />
            </div>
            <div className="space-y-1">
              <Label>Thưởng XP</Label>
              <Input name="xpReward" type="number" min={0} defaultValue={lesson.xpReward} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Mô tả ngắn</Label>
              <Textarea name="description" className="min-h-16" defaultValue={lesson.description ?? ""} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Lưu thông tin bài</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 7 phần kỹ năng */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="h-5 w-5 text-primary" /> Nội dung 7 phần
        </h2>
        <p className="-mt-1 text-sm text-muted-foreground">
          Mở từng phần để soạn nội dung riêng. Lưu xong bấm “Đang hiện” để học viên thấy; phần chưa lưu sẽ hiển thị
          “Sắp có”.
        </p>
        <div className="space-y-2">
          {SKILL_META.map((meta) => {
            const sec = bySkill.get(meta.key);
            return (
              <SectionPanel
                key={meta.key}
                lessonId={lesson.id}
                skill={meta.key}
                hskLevel={lesson.course.hskLevel}
                sectionId={sec?.id ?? null}
                published={sec?.published ?? false}
                initialContent={sec?.content ?? null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
