import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { deleteWritingAction, updateWritingAction } from "@/server/actions/admin";
import { revalidatePath } from "next/cache";
import { db as prisma } from "@/lib/db";
import { HSKLevel, WritingTaskType } from "@prisma/client";

async function createWritingAction(fd: FormData): Promise<void> {
  "use server";
  await requireAdmin();
  await prisma.writingTask.create({
    data: {
      taskType: fd.get("taskType") as WritingTaskType,
      prompt: fd.get("prompt") as string,
      promptZh: (fd.get("promptZh") as string) || undefined,
      outline: ((fd.get("outline") as string) || "").trim() || undefined,
      minChars: parseInt(fd.get("minChars") as string) || 50,
      timeLimit: parseInt(fd.get("timeLimit") as string) || 900,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      published: false,
    },
  });
  revalidatePath("/admin/writing");
}
import { Trash2, Plus } from "lucide-react";

const typeLabel: Record<string, string> = { FREE: "Tự do", GUIDED: "Hướng dẫn", PICTURE_DESCRIPTION: "Mô tả ảnh" };

export default async function AdminWritingPage() {
  const tasks = await db.writingTask.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  // Gom theo cấp HSK — mỗi cấp một <ReorderList> riêng (đổi thứ tự theo phạm vi cấp).
  const byLevel = new Map<HSKLevel, typeof tasks>();
  for (const task of tasks) {
    if (!byLevel.has(task.hskLevel)) byLevel.set(task.hskLevel, []);
    byLevel.get(task.hskLevel)!.push(task);
  }

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
              <Label>Tải ảnh đại diện lên</Label>
              <ImageUpload name="imageUrl" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đề bài (VI)</Label>
              <Textarea name="prompt" required />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Đề bài (ZH, tùy chọn)</Label>
              <Textarea name="promptZh" className="font-chinese" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Dàn ý gợi ý (tùy chọn — mỗi ý một dòng)</Label>
              <Textarea name="outline" rows={4} placeholder={"VD:\n- Mở bài: giới thiệu chủ đề\n- Thân bài: 2-3 ý chính + ví dụ\n- Kết bài: cảm nghĩ / kết luận"} />
              <p className="text-xs text-muted-foreground">Học viên phải bấm “Gợi ý dàn ý” mới thấy. Dàn ý cũng được AI dùng để chấm độ bám sát.</p>
            </div>
            <div className="space-y-1">
              <Label>Số chữ Hán tối thiểu</Label>
              <Input name="minChars" type="number" defaultValue="50" />
            </div>
            <div className="space-y-1">
              <Label>Giới hạn thời gian (giây)</Label>
              <Input name="timeLimit" type="number" defaultValue="900" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Button type="submit">Tạo bài viết</Button>
              <p className="text-xs text-muted-foreground">Bài mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {[...byLevel.entries()].map(([level, group]) => (
          <div key={level} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{hskLevelLabel(level)}</h2>
            <ReorderList
              spec={{ kind: "content", model: "writing", hskLevel: level }}
              items={group.map((task) => ({
                id: task.id,
                content: (
                  <Card>
                    <CardContent className="p-4 flex items-start justify-between gap-4">
                      <div className="flex flex-1 items-start gap-3">
                        {task.imageUrl && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={task.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                          </>
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{hskLevelLabel(task.hskLevel)}</Badge>
                            <Badge variant="secondary">{typeLabel[task.taskType]}</Badge>
                          </div>
                          <p className="text-sm">{task.prompt}</p>
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Sửa</summary>
                            <form action={async (fd: FormData) => { "use server"; await updateWritingAction(fd); }} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input type="hidden" name="id" value={task.id} />
                              <div className="space-y-1">
                                <Label>Loại bài</Label>
                                <select name="taskType" defaultValue={task.taskType} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                                  <option value="FREE">Tự do</option>
                                  <option value="GUIDED">Có hướng dẫn</option>
                                  <option value="PICTURE_DESCRIPTION">Mô tả ảnh</option>
                                </select>
                              </div>
                              <div className="space-y-1">
                                <Label>Cấp độ HSK</Label>
                                <select name="hskLevel" defaultValue={task.hskLevel} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                                  {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label>Tải ảnh đại diện lên</Label>
                                <ImageUpload name="imageUrl" defaultValue={task.imageUrl ?? undefined} />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label>Đề bài (VI)</Label>
                                <Textarea name="prompt" defaultValue={task.prompt} required />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label>Đề bài (ZH, tùy chọn)</Label>
                                <Textarea name="promptZh" className="font-chinese" defaultValue={task.promptZh ?? undefined} />
                              </div>
                              <div className="space-y-1 md:col-span-2">
                                <Label>Dàn ý gợi ý (tùy chọn — mỗi ý một dòng)</Label>
                                <Textarea name="outline" rows={4} defaultValue={task.outline ?? undefined} />
                              </div>
                              <div className="space-y-1">
                                <Label>Số chữ Hán tối thiểu</Label>
                                <Input name="minChars" type="number" defaultValue={task.minChars} />
                              </div>
                              <div className="space-y-1">
                                <Label>Giới hạn thời gian (giây)</Label>
                                <Input name="timeLimit" type="number" defaultValue={task.timeLimit} />
                              </div>
                              <div className="md:col-span-2">
                                <Button type="submit" size="sm">Lưu</Button>
                              </div>
                            </form>
                          </details>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <PublishToggle model="writing" id={task.id} published={task.published} />
                        <form action={async () => { "use server"; await deleteWritingAction(task.id); }}>
                          <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ),
              }))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
