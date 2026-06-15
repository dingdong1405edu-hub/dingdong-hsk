import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { deleteListeningAction } from "@/server/actions/admin";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { HSKLevel } from "@prisma/client";

async function createListeningAction(fd: FormData): Promise<void> {
  "use server";
  await requireAdmin();
  await prisma.listeningTest.create({
    data: {
      title: fd.get("title") as string,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      audioUrl: fd.get("audioUrl") as string,
      transcript: (fd.get("transcript") as string) || undefined,
      timeLimit: parseInt(fd.get("timeLimit") as string) || 300,
    },
  });
  revalidatePath("/admin/listening");
}
import { Trash2, Plus } from "lucide-react";

export default async function AdminListeningPage() {
  const tests = await db.listeningTest.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bài nghe hiểu</h1>
      <Card>
        <CardHeader><CardTitle className="text-base"><Plus className="h-4 w-4 inline mr-2" />Thêm bài nghe</CardTitle></CardHeader>
        <CardContent>
          <form action={createListeningAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tiêu đề</Label>
              <Input name="title" required />
            </div>
            <div className="space-y-1">
              <Label>URL Audio</Label>
              <Input name="audioUrl" placeholder="/audio/hsk1-test.mp3" required />
            </div>
            <div className="space-y-1">
              <Label>Cấp độ HSK</Label>
              <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Giới hạn thời gian (giây)</Label>
              <Input name="timeLimit" type="number" defaultValue="300" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Transcript (tùy chọn)</Label>
              <Textarea name="transcript" className="font-chinese" />
            </div>
            <div><Button type="submit">Tạo bài nghe</Button></div>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{test.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
                  <span className="text-xs text-muted-foreground">{test._count.questions} câu hỏi</span>
                </div>
              </div>
              <form action={async () => { "use server"; await deleteListeningAction(test.id); }}>
                <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
