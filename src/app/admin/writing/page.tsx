import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { deleteWritingAction } from "@/server/actions/admin";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { HSKLevel, WritingTaskType } from "@prisma/client";

async function createWritingAction(fd: FormData): Promise<void> {
  "use server";
  await prisma.writingTask.create({
    data: {
      taskType: fd.get("taskType") as WritingTaskType,
      prompt: fd.get("prompt") as string,
      promptZh: (fd.get("promptZh") as string) || undefined,
      minChars: parseInt(fd.get("minChars") as string) || 50,
      timeLimit: parseInt(fd.get("timeLimit") as string) || 900,
      hskLevel: fd.get("hskLevel") as HSKLevel,
    },
  });
  revalidatePath("/admin/writing");
}
import { Trash2, Plus } from "lucide-react";

export default async function AdminWritingPage() {
  const tasks = await db.writingTask.findMany({ orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }] });

  const typeLabel: Record<string, string> = { FREE: "Tự do", GUIDED: "Hướng dẫn", PICTURE_DESCRIPTION: "Mô tả ảnh" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bài luyện viết</h1>
      <Card>
        <CardHeader><CardTitle className="text-base"><Plus className="h-4 w-4 inline mr-2" />Thêm bài viết</CardTitle></CardHeader>
        <CardContent>
          <form action={createWritingAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Loại bài</Label>
              <select name="taskType" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                <option value="FREE">Tự do</option>
                <option value="GUIDED">Có hướng dẫn</option>
                <option value="PICTURE_DESCRIPTION">Mô tả ảnh</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>Cấp độ HSK</Label>
              <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đề bài (VI)</Label>
              <Textarea name="prompt" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đề bài (ZH, tùy chọn)</Label>
              <Textarea name="promptZh" className="font-chinese" />
            </div>
            <div className="space-y-1">
              <Label>Số chữ Hán tối thiểu</Label>
              <Input name="minChars" type="number" defaultValue="50" />
            </div>
            <div className="space-y-1">
              <Label>Giới hạn thời gian (giây)</Label>
              <Input name="timeLimit" type="number" defaultValue="900" />
            </div>
            <div><Button type="submit">Tạo bài viết</Button></div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{hskLevelLabel(task.hskLevel)}</Badge>
                  <Badge variant="secondary">{typeLabel[task.taskType]}</Badge>
                </div>
                <p className="text-sm">{task.prompt}</p>
              </div>
              <form action={async () => { "use server"; await deleteWritingAction(task.id); }}>
                <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
