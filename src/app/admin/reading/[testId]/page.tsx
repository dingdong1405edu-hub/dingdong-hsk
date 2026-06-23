import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { QuestionType, Prisma } from "@prisma/client";
import { Plus, ArrowLeft, Trash2, Save, Pencil, Sparkles, Wand2 } from "lucide-react";
import { deleteQuestionAction, updateReadingAction } from "@/server/actions/admin";
import { generateReadingExplanation, isGradingConfigured } from "@/lib/groq";
import { ReadingQuestionsImporter } from "@/components/admin/reading-questions-importer";

const HSK_LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

async function createQuestionAction(fd: FormData): Promise<void> {
  "use server";
  await requireAdmin();
  const type = fd.get("type") as QuestionType;
  const readingId = fd.get("readingId") as string;
  const prompt = fd.get("prompt") as string;
  let options: Prisma.InputJsonValue | undefined = undefined;
  let correctAnswer: Prisma.InputJsonValue = {};
  let correctAnswerText = "";

  if (type === "MCQ") {
    const opts = (fd.get("options") as string)
      .split("\n")
      .filter(Boolean)
      .map((t) => ({ text: t.trim() }));
    options = opts as Prisma.InputJsonValue;
    const idx = parseInt(fd.get("correctIndex") as string) || 0;
    correctAnswer = { index: idx };
    correctAnswerText = opts[idx]?.text ?? "";
  } else if (type === "TRUE_FALSE") {
    const value = fd.get("correctBool") === "true";
    correctAnswer = { value };
    correctAnswerText = value ? "Đúng" : "Sai";
  } else if (type === "FILL_BLANK") {
    const accepted = ((fd.get("correctAccepted") as string) || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const text = ((fd.get("correctText") as string) || "").trim();
    correctAnswer = { text, accepted };
    correctAnswerText = text;
  }

  // Giải thích + chỗ trích dẫn: ưu tiên admin tự nhập; nếu để trống thì nhờ Groq
  // sinh sẵn (chỉ cho học viên đáp án lấy ở đâu + giải thích chi tiết). Lỗi AI
  // không chặn việc tạo câu hỏi.
  let explanation = ((fd.get("explanation") as string) || "").trim() || undefined;
  let supportingQuote: string | undefined = undefined;
  if (!explanation && isGradingConfigured()) {
    try {
      const test = await prisma.readingTest.findUnique({
        where: { id: readingId },
        select: { passage: true, hskLevel: true },
      });
      if (test) {
        const r = await generateReadingExplanation({
          passage: test.passage,
          prompt,
          correctAnswer: correctAnswerText,
          hskLevel: test.hskLevel,
        });
        explanation = r.explanation || undefined;
        supportingQuote = r.supportingQuote || undefined;
      }
    } catch (e) {
      console.error("generateReadingExplanation failed:", e);
    }
  }

  // Append after existing questions so ordering is deterministic.
  const count = await prisma.question.count({ where: { readingId } });
  await prisma.question.create({
    data: {
      type,
      prompt,
      options: options ?? Prisma.JsonNull,
      correctAnswer,
      explanation,
      supportingQuote,
      readingId,
      order: count + 1,
    },
  });
  revalidatePath(`/admin/reading/${readingId}`);
}

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function AdminReadingDetailPage({ params }: Props) {
  const { testId } = await params;
  const test = await db.readingTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/reading"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách đề đọc
      </Link>
      <div>
        <h1 className="text-xl font-bold">{test.title}</h1>
        <p className="font-chinese text-muted-foreground">{test.titleZh}</p>
      </div>

      {/* Edit test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" /> Sửa bài đọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd: FormData) => {
              "use server";
              await updateReadingAction(fd);
            }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <input type="hidden" name="id" value={test.id} />
            <div className="space-y-1">
              <Label>Tiêu đề (VI)</Label>
              <Input name="title" defaultValue={test.title} required />
            </div>
            <div className="space-y-1">
              <Label>Tiêu đề (ZH)</Label>
              <Input name="titleZh" className="font-chinese" defaultValue={test.titleZh} required />
            </div>
            <div className="space-y-1">
              <Label>Cấp độ HSK</Label>
              <select
                name="hskLevel"
                defaultValue={test.hskLevel}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                required
              >
                {HSK_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Giới hạn thời gian (giây)</Label>
              <Input name="timeLimit" type="number" defaultValue={test.timeLimit} required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Tải ảnh đại diện lên</Label>
              <ImageUpload name="imageUrl" defaultValue={test.imageUrl} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đoạn văn (Hán tự)</Label>
              <Textarea name="passage" className="min-h-32 font-chinese" defaultValue={test.passage} required />
              <p className="text-xs text-muted-foreground">Không cần nhập pinyin — máy tự sinh khi hiển thị cho học viên.</p>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="gap-1.5">
                <Save className="h-4 w-4" /> Lưu thay đổi
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bulk add via AI / JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-primary" /> Thêm nhiều câu hỏi (AI / JSON)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReadingQuestionsImporter readingId={test.id} />
        </CardContent>
      </Card>

      {/* Add a single question manually */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm 1 câu hỏi (thủ công)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createQuestionAction} className="space-y-4">
            <input type="hidden" name="readingId" value={test.id} />
            <div className="space-y-1">
              <Label>Loại câu hỏi</Label>
              <select name="type" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                <option value="MCQ">Trắc nghiệm (MCQ)</option>
                <option value="TRUE_FALSE">Đúng / Sai</option>
                <option value="FILL_BLANK">Điền chỗ trống</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Câu hỏi</Label>
              <Input name="prompt" className="font-chinese" placeholder="Nội dung câu hỏi..." required />
            </div>
            <div className="space-y-1">
              <Label>Đáp án MCQ (mỗi dòng 1 lựa chọn)</Label>
              <Textarea
                name="options"
                className="font-chinese"
                placeholder="Lựa chọn A&#10;Lựa chọn B&#10;Lựa chọn C&#10;Lựa chọn D"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                <Input name="correctText" className="font-chinese" placeholder="Đáp án điền..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Điền · đáp án chấp nhận thêm (mỗi dòng 1, tùy chọn)</Label>
              <Textarea name="correctAccepted" className="font-chinese" placeholder="Đáp án thay thế..." />
            </div>
            <div className="space-y-1">
              <Label>Giải thích (tùy chọn)</Label>
              <Textarea name="explanation" className="min-h-16" placeholder="Giải thích đáp án..." />
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Để trống để AI (Groq) tự tạo giải thích chi tiết + chỉ ra câu trong bài chứa đáp án.
              </p>
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
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1.5">
                  <div>
                    <span className="text-xs font-semibold text-muted-foreground">{idx + 1}. </span>
                    <span className="font-chinese text-sm">{q.prompt}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {q.type}
                  </Badge>
                  {q.supportingQuote && (
                    <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
                      📍 <span className="font-chinese">{q.supportingQuote}</span>
                    </p>
                  )}
                  {q.explanation && (
                    <p className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">💡 {q.explanation}</p>
                  )}
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteQuestionAction(q.id, { readingId: test.id });
                  }}
                >
                  <Button size="sm" variant="ghost" type="submit" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}
        {test.questions.length === 0 && (
          <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
            Chưa có câu hỏi nào. Thêm câu hỏi ở trên.
          </p>
        )}
      </div>
    </div>
  );
}
