import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/image-upload";
import { ListeningAudioFields } from "@/components/admin/listening-audio-fields";
import { Plus, Trash2, Save, Pencil, Headphones, BookText, PenLine } from "lucide-react";
import type { Skill } from "@prisma/client";
import { sectionLabel } from "@/lib/mock-exam";
import { PartBlock, type ExamPartData } from "./part-block";
import { createPartAction, deleteSectionAction, updateSectionAction } from "@/server/actions/mock-exam";

export interface ExamSectionData {
  id: string;
  skill: Skill;
  title: string;
  instructions: string | null;
  parts: ExamPartData[];
}

function SkillIcon({ skill }: { skill: Skill }) {
  if (skill === "LISTENING") return <Headphones className="h-4 w-4 text-teal-600" />;
  if (skill === "READING") return <BookText className="h-4 w-4 text-emerald-600" />;
  return <PenLine className="h-4 w-4 text-violet-600" />;
}

export function SectionBlock({ section, examId }: { section: ExamSectionData; examId: string }) {
  const { skill } = section;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <SkillIcon skill={skill} /> {sectionLabel(skill, section.title)}
          </span>
          <form
            action={async () => {
              "use server";
              await deleteSectionAction(section.id, examId);
            }}
          >
            <Button size="sm" variant="ghost" type="submit" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Xoá phần
            </Button>
          </form>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Edit section */}
        <details>
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
            <Pencil className="mr-1 inline h-3 w-3" /> Sửa thông tin phần
          </summary>
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateSectionAction(fd);
            }}
            className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={section.id} />
            <input type="hidden" name="examId" value={examId} />
            <div className="space-y-1">
              <Label>Tiêu đề phần (để trống = mặc định)</Label>
              <Input name="title" defaultValue={section.title} className="font-chinese" placeholder="一、听力" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Hướng dẫn phần (tùy chọn)</Label>
              <Textarea name="instructions" defaultValue={section.instructions ?? ""} className="min-h-14" />
            </div>
            <div>
              <Button type="submit" size="sm" className="gap-1.5">
                <Save className="h-4 w-4" /> Lưu phần
              </Button>
            </div>
          </form>
        </details>

        {/* Parts */}
        {section.parts.length > 0 ? (
          <div className="space-y-2">
            {section.parts.map((p, i) => (
              <PartBlock key={p.id} part={p} examId={examId} sectionId={section.id} skill={skill} index={i} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground">
            Chưa có tiểu phần nào. Thêm tiểu phần ở dưới.
          </p>
        )}

        {/* Add part */}
        <details className="rounded-xl border border-dashed p-3">
          <summary className="cursor-pointer text-sm font-semibold text-primary">
            <Plus className="mr-1 inline h-4 w-4" /> Thêm tiểu phần
          </summary>
          <form
            action={async (fd: FormData) => {
              "use server";
              await createPartAction(fd);
            }}
            className="mt-3 space-y-3"
          >
            <input type="hidden" name="examId" value={examId} />
            <input type="hidden" name="sectionId" value={section.id} />
            <div className="space-y-1">
              <Label>Tiêu đề tiểu phần</Label>
              <Input name="title" className="font-chinese" placeholder="第一部分" />
            </div>
            <div className="space-y-1">
              <Label>Hướng dẫn / ví dụ (tùy chọn)</Label>
              <Textarea name="instructions" className="min-h-14" placeholder="例如：..." />
            </div>

            {skill === "READING" && (
              <>
                <div className="space-y-1">
                  <Label>Đoạn văn (Hán tự)</Label>
                  <Textarea name="passage" className="min-h-24 font-chinese" placeholder="Nội dung đoạn văn..." />
                </div>
                <div className="space-y-1">
                  <Label>Pinyin (tùy chọn)</Label>
                  <Textarea name="passagePinyin" className="min-h-16 font-pinyin" />
                </div>
              </>
            )}

            {skill === "LISTENING" && <ListeningAudioFields idSuffix={`-new-${section.id}`} />}

            {skill === "WRITING" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Đề bài viết tự luận (để trống nếu chỉ dùng câu hỏi)</Label>
                  <Textarea name="writingPrompt" className="min-h-16" placeholder="Đề bài viết..." />
                </div>
                <div className="space-y-1">
                  <Label>Số chữ tối thiểu</Label>
                  <Input name="writingMinChars" type="number" min="0" placeholder="80" />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label>Ảnh minh hoạ (tùy chọn)</Label>
              <ImageUpload name="imageUrl" />
            </div>
            <Button type="submit" size="sm">Thêm tiểu phần</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  );
}
