import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminActor } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Trash2, ChevronRight } from "lucide-react";
import { db as prisma } from "@/lib/db";
import { updateUnitAction } from "@/server/actions/admin";

async function createGrammarUnitAction(fd: FormData) {
  "use server";
  const { actor } = await requireAdminActor();
  const level = fd.get("hskLevel") as HSKLevel;
  const count = await prisma.grammarUnit.count({ where: { hskLevel: level } });
  const created = await prisma.grammarUnit.create({
    data: {
      title: fd.get("title") as string,
      titleZh: fd.get("titleZh") as string,
      hskLevel: level,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      order: count + 1,
      published: false,
    },
  });
  await logAudit({
    actor,
    action: "CREATE",
    entity: "GrammarUnit",
    entityId: created.id,
    summary: `Tạo unit ngữ pháp «${created.title}»`,
    after: created,
  });
  revalidatePath("/admin/grammar");
}

async function deleteGrammarUnitAction(id: string) {
  "use server";
  const { actor } = await requireAdminActor();
  const deleted = await prisma.grammarUnit.delete({ where: { id } });
  await logAudit({
    actor,
    action: "DELETE",
    entity: "GrammarUnit",
    entityId: deleted.id,
    summary: `Xóa unit ngữ pháp «${deleted.title}»`,
    before: deleted,
  });
  revalidatePath("/admin/grammar");
}

// Bọc shared action (trả {ok,error}) thành dạng <form action> (trả void).
async function updateGrammarUnitFormAction(fd: FormData) {
  "use server";
  await updateUnitAction("grammar", fd);
}

export default async function AdminGrammarPage() {
  const units = await db.grammarUnit.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: { _count: { select: { lessons: true } } },
  });

  // Nhóm units theo cấp HSK — mỗi cấp có một <ReorderList> riêng (đổi chỗ scope theo cấp).
  const byLevel = new Map<HSKLevel, typeof units>();
  for (const u of units) {
    if (!byLevel.has(u.hskLevel)) byLevel.set(u.hskLevel, []);
    byLevel.get(u.hskLevel)!.push(u);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ngữ pháp — Units</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Thêm unit ngữ pháp</CardTitle></CardHeader>
        <CardContent>
          <form action={createGrammarUnitAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label>Tên (VI)</Label>
              <Input name="title" required />
            </div>
            <div className="space-y-1">
              <Label>Tên (ZH)</Label>
              <Input name="titleZh" className="font-chinese" required />
            </div>
            <div className="space-y-1">
              <Label>HSK Level</Label>
              <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-4">
              <Label>Tải ảnh đại diện cho unit lên</Label>
              <ImageUpload name="imageUrl" />
            </div>
            <Button type="submit">Tạo</Button>
            <p className="text-[11px] text-muted-foreground sm:col-span-3">
              Unit mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.
            </p>
          </form>
        </CardContent>
      </Card>

      {units.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Chưa có unit nào. Dùng form bên trên để tạo unit đầu tiên.
        </p>
      ) : (
        <div className="space-y-6">
          {[...byLevel.entries()].map(([level, group]) => (
            <div key={level} className="space-y-2">
              <h2 className="text-lg font-bold">{hskLevelLabel(level)}</h2>
              <ReorderList
                spec={{ kind: "units", skill: "grammar", hskLevel: level }}
                items={group.map((u) => ({
                  id: u.id,
                  content: (
                    <Card>
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {u.imageUrl && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={u.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                              </>
                            )}
                            <div>
                              <span className="font-semibold">{u.title}</span>
                              <span className="font-chinese text-muted-foreground ml-2 text-sm">{u.titleZh}</span>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{hskLevelLabel(u.hskLevel)}</Badge>
                                <span className="text-xs text-muted-foreground">{u._count.lessons} bài</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <PublishToggle model="grammarUnit" id={u.id} published={u.published} />
                            <Link href={`/admin/grammar/${u.id}`}>
                              <Button size="sm" variant="outline">
                                <ChevronRight className="h-4 w-4" /> Bài học
                              </Button>
                            </Link>
                            <form action={async () => { "use server"; await deleteGrammarUnitAction(u.id); }}>
                              <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
                            </form>
                          </div>
                        </div>

                        <details>
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Sửa</summary>
                          <form action={updateGrammarUnitFormAction} className="mt-3 space-y-3">
                            <input type="hidden" name="id" value={u.id} />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label>Tên (VI)</Label>
                                <Input name="title" defaultValue={u.title} required />
                              </div>
                              <div className="space-y-1">
                                <Label>Tên (ZH)</Label>
                                <Input name="titleZh" className="font-chinese" defaultValue={u.titleZh} required />
                              </div>
                              <div className="space-y-1">
                                <Label>HSK Level</Label>
                                <select name="hskLevel" defaultValue={u.hskLevel} className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                                  {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Tải ảnh đại diện cho unit lên</Label>
                              <ImageUpload name="imageUrl" defaultValue={u.imageUrl} />
                            </div>
                            <Button type="submit" size="sm">Lưu</Button>
                          </form>
                        </details>
                      </CardContent>
                    </Card>
                  ),
                }))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
