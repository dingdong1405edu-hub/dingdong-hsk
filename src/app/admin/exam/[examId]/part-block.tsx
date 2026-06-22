import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { ListeningAudioFields } from "@/components/admin/listening-audio-fields";
import { Plus, Trash2, Save, Pencil, Sparkles } from "lucide-react";
import type { Skill } from "@prisma/client";
import {
  createExamQuestionAction,
  deleteExamQuestionAction,
  deletePartAction,
  updatePartAction,
} from "@/server/actions/mock-exam";

interface ExamQuestion {
  id: string;
  type: string;
  prompt: string;
  options: unknown;
  correctAnswer: unknown;
  explanation: string | null;
  supportingQuote: string | null;
}

export interface ExamPartData {
  id: string;
  title: string;
  instructions: string | null;
  imageUrl: string | null;
  passage: string | null;
  passagePinyin: string | null;
  audioUrl: string | null;
  transcript: string | null;
  writingPrompt: string | null;
  writingMinChars: number | null;
  questions: ExamQuestion[];
}

/** Một tiểu phần (第一部分...) trong trình soạn đề. Trường hiển thị tuỳ theo kỹ năng
 * của phần: Đọc → đoạn văn; Nghe → audio + transcript; Viết → ô viết tự luận. */
export function PartBlock({
  part,
  examId,
  sectionId,
  skill,
  index,
}: {
  part: ExamPartData;
  examId: string;
  sectionId: string;
  skill: Skill;
  index: number;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {part.title || `Tiểu phần ${index + 1}`}
          </span>
          {part.passage && <Badge variant="secondary" className="text-[10px]">Đoạn văn</Badge>}
          {part.audioUrl && <Badge variant="secondary" className="text-[10px]">Audio</Badge>}
          {part.writingPrompt && <Badge variant="secondary" className="text-[10px]">Viết tự luận</Badge>}
          <span className="text-xs text-muted-foreground">{part.questions.length} câu</span>
        </div>
        <form
          action={async () => {
            "use server";
            await deletePartAction(part.id, examId);
          }}
        >
          <Button size="sm" variant="ghost" type="submit" className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {/* Edit part */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
          <Pencil className="mr-1 inline h-3 w-3" /> Sửa tiểu phần
        </summary>
        <form
          action={async (fd: FormData) => {
            "use server";
            await updatePartAction(fd);
          }}
          className="mt-2 space-y-3"
        >
          <input type="hidden" name="id" value={part.id} />
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="sectionId" value={sectionId} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tiêu đề tiểu phần</Label>
              <Input name="title" defaultValue={part.title} className="font-chinese" placeholder="第一部分" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Hướng dẫn / ví dụ (tùy chọn)</Label>
            <Textarea name="instructions" defaultValue={part.instructions ?? ""} className="min-h-16" />
          </div>

          {skill === "READING" && (
            <>
              <div className="space-y-1">
                <Label>Đoạn văn (Hán tự)</Label>
                <Textarea name="passage" defaultValue={part.passage ?? ""} className="min-h-24 font-chinese" />
              </div>
              <div className="space-y-1">
                <Label>Pinyin (tùy chọn)</Label>
                <Textarea name="passagePinyin" defaultValue={part.passagePinyin ?? ""} className="min-h-16 font-pinyin" />
              </div>
            </>
          )}

          {skill === "LISTENING" && (
            <ListeningAudioFields
              defaultAudioUrl={part.audioUrl}
              defaultTranscript={part.transcript}
              idSuffix={`-${part.id}`}
            />
          )}

          {skill === "WRITING" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-2">
                <Label>Đề bài viết tự luận (để trống nếu tiểu phần chỉ gồm câu hỏi)</Label>
                <Textarea name="writingPrompt" defaultValue={part.writingPrompt ?? ""} className="min-h-16" />
              </div>
              <div className="space-y-1">
                <Label>Số chữ tối thiểu</Label>
                <Input name="writingMinChars" type="number" min="0" defaultValue={part.writingMinChars ?? ""} />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Ảnh minh hoạ (tùy chọn)</Label>
            <ImageUpload name="imageUrl" defaultValue={part.imageUrl} />
          </div>
          <Button type="submit" size="sm" className="gap-1.5">
            <Save className="h-4 w-4" /> Lưu tiểu phần
          </Button>
        </form>
      </details>

      {/* Questions */}
      {part.questions.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {part.questions.map((q, qi) => (
            <div key={q.id} className="flex items-start justify-between gap-2 rounded-lg border bg-card p-2">
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-muted-foreground">{qi + 1}. </span>
                <span className="font-chinese text-sm">{q.prompt}</span>
                <Badge variant="outline" className="ml-1.5 text-[10px]">{q.type}</Badge>
                {q.explanation && (
                  <p className="mt-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">💡 {q.explanation}</p>
                )}
              </div>
              <form
                action={async () => {
                  "use server";
                  await deleteExamQuestionAction(q.id, examId);
                }}
              >
                <Button size="sm" variant="ghost" type="submit" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}

      {/* Add question */}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-primary">
          <Plus className="mr-1 inline h-3 w-3" /> Thêm câu hỏi
        </summary>
        <form
          action={async (fd: FormData) => {
            "use server";
            await createExamQuestionAction(fd);
          }}
          className="mt-2 space-y-3"
        >
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="examPartId" value={part.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Loại câu hỏi</Label>
              <select name="type" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                <option value="MCQ">Trắc nghiệm (MCQ)</option>
                <option value="TRUE_FALSE">Đúng / Sai</option>
                <option value="FILL_BLANK">Điền chỗ trống</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Pinyin câu hỏi (tùy chọn)</Label>
              <Input name="promptPinyin" className="font-pinyin" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Câu hỏi</Label>
            <Input name="prompt" className="font-chinese" placeholder="Nội dung câu hỏi..." required />
          </div>
          <div className="space-y-1">
            <Label>Đáp án MCQ (mỗi dòng 1 lựa chọn)</Label>
            <Textarea name="options" className="font-chinese" placeholder="Lựa chọn A&#10;Lựa chọn B&#10;Lựa chọn C&#10;Lựa chọn D" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>MCQ · đáp án đúng (từ 0)</Label>
              <Input name="correctIndex" type="number" defaultValue="0" />
            </div>
            <div className="space-y-1">
              <Label>Đúng/Sai · đáp án</Label>
              <select name="correctBool" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                <option value="true">Đúng</option>
                <option value="false">Sai</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Điền · đáp án đúng</Label>
              <Input name="correctText" className="font-chinese" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Điền · đáp án chấp nhận thêm (mỗi dòng 1, tùy chọn)</Label>
            <Textarea name="correctAccepted" className="font-chinese" />
          </div>
          <div className="space-y-1">
            <Label>Giải thích (tùy chọn)</Label>
            <Textarea name="explanation" className="min-h-14" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Để trống để AI tự tạo giải thích (chỉ với câu Đọc có đoạn văn).
            </p>
          </div>
          <Button type="submit" size="sm">Thêm câu hỏi</Button>
        </form>
      </details>
    </div>
  );
}
