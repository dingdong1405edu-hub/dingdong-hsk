import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { ListeningAudioFields } from "@/components/admin/listening-audio-fields";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList, type ReorderItem } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { createListeningAction, deleteListeningAction } from "@/server/actions/admin";
import { Trash2, Plus, ChevronRight, Headphones, Volume2 } from "lucide-react";
import type { HSKLevel } from "@prisma/client";

export default async function AdminListeningPage() {
  const tests = await db.listeningTest.findMany({
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
      <div className="flex items-center gap-2">
        <Headphones className="h-6 w-6 text-teal-600" />
        <h1 className="text-2xl font-bold">Bài nghe hiểu</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Thêm bài nghe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              "use server";
              await createListeningAction(fd);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Tiêu đề</Label>
                <Input name="title" required placeholder="VD: Hội thoại chào hỏi" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Cấp độ HSK</Label>
                  <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                    {["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"].map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>Thời gian (giây)</Label>
                  <Input name="timeLimit" type="number" defaultValue="300" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Hình minh hoạ</Label>
              <ImageUpload name="imageUrl" />
            </div>

            <ListeningAudioFields idSuffix="create" />

            <div className="space-y-2">
              <Button type="submit">Tạo bài nghe</Button>
              <p className="text-xs text-muted-foreground">Bài mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      {tests.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Chưa có bài nghe nào.
        </p>
      ) : (
        <div className="space-y-8">
          {[...byLevel.entries()].map(([level, group]) => {
            const items: ReorderItem[] = group.map((test) => ({
              id: test.id,
              content: (
                <Card>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      {test.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={test.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      )}
                      <div>
                        <div className="font-semibold">{test.title}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{hskLevelLabel(test.hskLevel)}</Badge>
                          <span className="text-xs text-muted-foreground">{test._count.questions} câu hỏi</span>
                          <span
                            className={
                              "inline-flex items-center gap-1 text-xs " +
                              (test.audioUrl ? "text-teal-600" : "text-amber-600")
                            }
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            {test.audioUrl ? "Có audio" : "Chưa có audio"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <PublishToggle model="listening" id={test.id} published={test.published} />
                      <Link href={`/admin/listening/${test.id}`}>
                        <Button size="sm" variant="outline">
                          <ChevronRight className="h-4 w-4" /> Mở
                        </Button>
                      </Link>
                      <form
                        action={async () => {
                          "use server";
                          await deleteListeningAction(test.id);
                        }}
                      >
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
                <ReorderList spec={{ kind: "content", model: "listening", hskLevel: level }} items={items} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
