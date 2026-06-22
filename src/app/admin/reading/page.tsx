import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList, type ReorderItem } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { deleteReadingAction } from "@/server/actions/admin";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { HSKLevel } from "@prisma/client";

async function createReadingAction(fd: FormData): Promise<void> {
  "use server";
  await requireAdmin();
  await prisma.readingTest.create({
    data: {
      title: fd.get("title") as string,
      titleZh: fd.get("titleZh") as string,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      passage: fd.get("passage") as string,
      passagePinyin: (fd.get("passagePinyin") as string) || undefined,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      timeLimit: parseInt(fd.get("timeLimit") as string),
      published: false,
    },
  });
  revalidatePath("/admin/reading");
}
import { Trash2, Plus, ChevronRight } from "lucide-react";

export default async function AdminReadingPage() {
  const tests = await db.readingTest.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { questions: true } } },
  });

  // Nhóm theo cấp HSK — đổi thứ tự được giới hạn trong từng cấp.
  const byLevel = new Map<HSKLevel, typeof tests>();
  for (const t of tests) {
    if (!byLevel.has(t.hskLevel)) byLevel.set(t.hskLevel, []);
    byLevel.get(t.hskLevel)!.push(t);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bài đọc hiểu</h1>

      {/* Create form */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Thêm bài đọc mới</CardTitle></CardHeader>
        <CardContent>
          <form action={createReadingAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tiêu đề (VI)</Label>
              <Input name="title" placeholder="Tên bài đọc..." required />
            </div>
            <div className="space-y-1">
              <Label>Tiêu đề (ZH)</Label>
              <Input name="titleZh" className="font-chinese" placeholder="标题..." required />
            </div>
            <div className="space-y-1">
              <Label>Cấp độ HSK</Label>
              <select name="hskLevel" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" required>
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Giới hạn thời gian (giây)</Label>
              <Input name="timeLimit" type="number" defaultValue="600" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Tải ảnh đại diện lên</Label>
              <ImageUpload name="imageUrl" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đoạn văn (Hán tự)</Label>
              <Textarea name="passage" className="font-chinese min-h-32" placeholder="Nội dung đoạn văn..." required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Pinyin (tùy chọn)</Label>
              <Textarea name="passagePinyin" className="font-pinyin min-h-20" placeholder="Pinyin tương ứng..." />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Button type="submit">Tạo bài đọc</Button>
              <p className="text-xs text-muted-foreground">Bài mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List — nhóm theo cấp HSK, mỗi cấp một ReorderList riêng */}
      <div className="space-y-8">
        {[...byLevel.entries()].map(([level, group]) => {
          const items: ReorderItem[] = group.map((test) => ({
            id: test.id,
            content: (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {test.imageUrl && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={test.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      </>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{test.title}</span>
                        <span className="font-chinese text-muted-foreground text-sm">{test.titleZh}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
                        <span className="text-xs text-muted-foreground">{test._count.questions} câu hỏi</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <PublishToggle model="reading" id={test.id} published={test.published} />
                    <Link href={`/admin/reading/${test.id}`}>
                      <Button size="sm" variant="outline">
                        <ChevronRight className="h-4 w-4" /> Câu hỏi
                      </Button>
                    </Link>
                    <form action={async () => { "use server"; await deleteReadingAction(test.id); }}>
                      <Button size="sm" variant="destructive" type="submit">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ),
          }));
          return (
            <div key={level} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{hskLevelLabel(level)}</h2>
              <ReorderList spec={{ kind: "content", model: "reading", hskLevel: level }} items={items} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
