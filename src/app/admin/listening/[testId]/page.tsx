import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { hskLevelLabel } from "@/lib/utils";
import { createQuestionAction, deleteQuestionAction } from "@/server/actions/admin";

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

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{test.title}</h1>
          <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audio &amp; lời thoại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <audio controls src={test.audioUrl} className="w-full">
            Trình duyệt không hỗ trợ phát audio.
          </audio>
          <p className="break-all text-xs text-muted-foreground">{test.audioUrl}</p>
          {test.transcript && (
            <p className="font-chinese text-sm leading-relaxed text-muted-foreground">{test.transcript}</p>
          )}
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
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">Đúng/Sai</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Câu hỏi</Label>
              <Input name="prompt" className="font-chinese" placeholder="Nội dung câu hỏi..." required />
            </div>
            <div className="space-y-1">
              <Label>Đáp án (mỗi dòng 1 option — dùng cho MCQ)</Label>
              <Textarea name="options" className="font-chinese" placeholder="Option A&#10;Option B&#10;Option C&#10;Option D" />
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
              <Label>Giải thích (tùy chọn)</Label>
              <Input name="explanation" className="font-chinese" placeholder="Giải thích đáp án..." />
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
