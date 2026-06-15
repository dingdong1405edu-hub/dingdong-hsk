import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { QuestionType, Prisma } from "@prisma/client";

async function createQuestionAction(fd: FormData): Promise<void> {
  "use server";
  await requireAdmin();
  const type = fd.get("type") as QuestionType;
  const readingId = fd.get("readingId") as string;
  let options: Prisma.InputJsonValue | undefined = undefined;
  let correctAnswer: Prisma.InputJsonValue = {};

  if (type === "MCQ") {
    const opts = (fd.get("options") as string).split("\n").filter(Boolean).map((t) => ({ text: t.trim() }));
    options = opts as Prisma.InputJsonValue;
    correctAnswer = { index: parseInt(fd.get("correctIndex") as string) };
  } else if (type === "TRUE_FALSE") {
    correctAnswer = { value: fd.get("correctBool") === "true" };
  }

  await prisma.question.create({
    data: {
      type,
      prompt: fd.get("prompt") as string,
      options: options ?? Prisma.JsonNull,
      correctAnswer,
      explanation: (fd.get("explanation") as string) || undefined,
      readingId,
    },
  });
  revalidatePath(`/admin/reading/${readingId}`);
}
import { Plus, Trash2 } from "lucide-react";

interface Props { params: Promise<{ testId: string }> }

export default async function AdminReadingDetailPage({ params }: Props) {
  const { testId } = await params;
  const test = await db.readingTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{test.title}</h1>
        <p className="font-chinese text-muted-foreground">{test.titleZh}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Đoạn văn</CardTitle></CardHeader>
        <CardContent>
          <p className="font-chinese text-sm leading-relaxed">{test.passage}</p>
        </CardContent>
      </Card>

      {/* Add question */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm câu hỏi</CardTitle></CardHeader>
        <CardContent>
          <form action={createQuestionAction} className="space-y-4">
            <input type="hidden" name="readingId" value={test.id} />
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
              <Label>Đáp án (mỗi dòng 1 option)</Label>
              <Textarea name="options" className="font-chinese" placeholder="Option A&#10;Option B&#10;Option C&#10;Option D" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Index đáp án đúng (MCQ, bắt đầu từ 0)</Label>
                <Input name="correctIndex" type="number" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label>Giải thích</Label>
                <Input name="explanation" className="font-chinese" placeholder="Giải thích đáp án..." />
              </div>
            </div>
            <Button type="submit">Thêm câu hỏi</Button>
          </form>
        </CardContent>
      </Card>

      {/* Questions list */}
      <div className="space-y-2">
        {test.questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-muted-foreground">{idx + 1}. </span>
                  <span className="font-chinese text-sm">{q.prompt}</span>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-xs">{q.type}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
