import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { db as prisma } from "@/lib/db";

async function createUnitAction(fd: FormData) {
  "use server";
  await requireAdmin();
  const level = fd.get("hskLevel") as HSKLevel;
  const count = await prisma.vocabUnit.count({ where: { hskLevel: level } });
  await prisma.vocabUnit.create({
    data: {
      title: fd.get("title") as string,
      titleZh: fd.get("titleZh") as string,
      hskLevel: level,
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      order: count + 1,
    },
  });
  revalidatePath("/admin/vocab");
}

async function deleteUnitAction(id: string) {
  "use server";
  await requireAdmin();
  await prisma.vocabUnit.delete({ where: { id } });
  revalidatePath("/admin/vocab");
}

export default async function AdminVocabPage() {
  const units = await db.vocabUnit.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: { _count: { select: { lessons: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Từ vựng — Units</h1>
      <Card>
        <CardHeader><CardTitle className="text-base"><Plus className="h-4 w-4 inline mr-2" />Thêm unit</CardTitle></CardHeader>
        <CardContent>
          <form action={createUnitAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
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
            <div className="space-y-1">
              <Label>Hình minh hoạ (URL)</Label>
              <Input name="imageUrl" placeholder="https://... hoặc /images/..." />
            </div>
            <Button type="submit">Tạo</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {units.map((u) => (
          <Card key={u.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
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
                    <span className="text-xs text-muted-foreground">{u._count.lessons} bài học</span>
                  </div>
                </div>
              </div>
              <form action={async () => { "use server"; await deleteUnitAction(u.id); }}>
                <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
