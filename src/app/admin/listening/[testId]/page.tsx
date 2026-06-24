import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Pencil, Sparkles } from "lucide-react";
import { hskLevelLabel } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/image-upload";
import { ListeningAudioFields } from "@/components/admin/listening-audio-fields";
import { ListeningQuestionsImporter } from "@/components/admin/listening-questions-importer";
import {
  createQuestionAction,
  deleteQuestionAction,
  updateListeningAction,
} from "@/server/actions/admin";

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function AdminListeningDetailPage({ params }: Props) {
  const { testId } = await params;
  const test = await db.listeningTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/listening"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách bài nghe
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold">{test.title}</h1>
        <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
      </div>

      {/* Edit audio / transcript / meta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" /> Audio &amp; lời thoại
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              "use server";
              await updateListeningAction(fd);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={test.id} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Tiêu đề</Label>
                <Input name="title" defaultValue={test.title} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cấp độ HSK</Label>
                  <select
                    name="hskLevel"
                    defaultValue={test.hskLevel}
                    className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  >
                    {["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Thời gian (giây)</Label>
                  <Input name="timeLimit" type="number" defaultValue={test.timeLimit} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Hình minh hoạ</Label>
              <ImageUpload name="imageUrl" defaultValue={test.imageUrl} />
            </div>

            <ListeningAudioFields
              idSuffix="edit"
              listeningId={test.id}
              defaultAudioUrl={test.audioUrl}
              defaultTranscript={test.transcript}
              defaultTranscriptExplanation={test.transcriptExplanation}
            />

            <Button type="submit" className="gap-1.5">
              <Save className="h-4 w-4" /> Lưu thay đổi
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* AI generate questions from the tapescript (Groq) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> AI tạo câu hỏi từ lời thoại
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListeningQuestionsImporter listeningId={test.id} />
        </CardContent>
      </Card>

      {/* Add question */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd: FormData) => {
              "use server";
              await createQuestionAction(fd);
            }}
            className="space-y-4"
          >
            <input type="hidden" name="listeningId" value={test.id} />
            <div className="space-y-1">
              <Label>Loại câu hỏi</Label>
              <select name="type" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                <option value="MCQ">MCQ (trắc nghiệm)</option>
                <option value="TRUE_FALSE">Đúng/Sai</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Câu hỏi</Label>
              <Input name="prompt" className="font-chinese" placeholder="Nội dung câu hỏi..." required />
            </div>
            <div className="space-y-1">
              <Label>Đáp án (mỗi dòng 1 option — dùng cho MCQ)</Label>
              <Textarea
                name="options"
                className="font-chinese"
                placeholder="Option A&#10;Option B&#10;Option C&#10;Option D"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Index đáp án đúng (MCQ, bắt đầu từ 0)</Label>
                <Input name="correctIndex" type="number" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label>Đáp án đúng (Đúng/Sai)</Label>
                <select name="correctBool" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                  <option value="true">Đúng</option>
                  <option value="false">Sai</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Giải thích (vì sao chọn đáp án này)</Label>
              <Textarea
                name="explanation"
                className="font-chinese"
                placeholder="Giải thích để hiển thị khi chữa bài..."
              />
            </div>
            <Button type="submit">Thêm câu hỏi</Button>
          </form>
        </CardContent>
      </Card>

      {/* Questions list */}
      <div className="space-y-2">
        {test.questions.length === 0 ? (
          <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
            Chưa có câu hỏi nào cho bài nghe này.
          </p>
        ) : (
          test.questions.map((q, idx) => (
            <Card key={q.id}>
              <CardContent className="flex items-start justify-between gap-3 p-3">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-muted-foreground">{idx + 1}. </span>
                  <span className="font-chinese text-sm">{q.prompt}</span>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {q.type}
                    </Badge>
                  </div>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteQuestionAction(q.id, { listeningId: test.id });
                  }}
                >
                  <Button size="sm" variant="ghost" type="submit" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
