import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList } from "@/components/admin/reorder-list";
import { hskLevelLabel, toneColor } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { updateHanziAction } from "@/server/actions/admin";
import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { db as prisma } from "@/lib/db";

async function createHanziAction(fd: FormData) {
  "use server";
  await requireAdmin();
  await prisma.hanziCharacter.create({
    data: {
      character: fd.get("character") as string,
      pinyin: fd.get("pinyin") as string,
      tone: parseInt(fd.get("tone") as string),
      meaning: fd.get("meaning") as string,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      strokeCount: parseInt(fd.get("strokeCount") as string),
      strokeOrder: {},
      examples: [],
      imageUrl: (fd.get("imageUrl") as string) || undefined,
      published: false,
    },
  });
  revalidatePath("/admin/hanzi");
}

async function deleteHanziAction(id: string) {
  "use server";
  await requireAdmin();
  await prisma.hanziCharacter.delete({ where: { id } });
  revalidatePath("/admin/hanzi");
}

export default async function AdminHanziPage() {
  const chars = await db.hanziCharacter.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { character: "asc" }],
  });

  // Nhóm theo cấp HSK — mỗi cấp là một danh sách đổi chỗ độc lập.
  const byLevel = new Map<HSKLevel, typeof chars>();
  for (const c of chars) {
    if (!byLevel.has(c.hskLevel)) byLevel.set(c.hskLevel, []);
    byLevel.get(c.hskLevel)!.push(c);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Chữ Hán</h1>
      <Card>
        <CardHeader><CardTitle className="text-base"><Plus className="h-4 w-4 inline mr-2" />Thêm chữ Hán</CardTitle></CardHeader>
        <CardContent>
          <form action={createHanziAction} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label>Chữ Hán</Label>
              <Input name="character" className="font-chinese text-xl" maxLength={1} required />
            </div>
            <div className="space-y-1">
              <Label>Pinyin</Label>
              <Input name="pinyin" className="font-pinyin" required />
            </div>
            <div className="space-y-1">
              <Label>Thanh điệu (0-4)</Label>
              <Input name="tone" type="number" min="0" max="4" defaultValue="1" required />
            </div>
            <div className="space-y-1">
              <Label>Nghĩa</Label>
              <Input name="meaning" required />
            </div>
            <div className="space-y-1">
              <Label>HSK Level</Label>
              <select name="hskLevel" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Số nét</Label>
              <Input name="strokeCount" type="number" defaultValue="5" required />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-4">
              <Label>Tải ảnh minh hoạ lên</Label>
              <ImageUpload name="imageUrl" />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <Button type="submit" className="w-full">Thêm chữ</Button>
            </div>
            <p className="col-span-2 sm:col-span-4 text-xs text-muted-foreground">
              Bài mới sẽ ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.
            </p>
          </form>
        </CardContent>
      </Card>

      {chars.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có chữ Hán nào.</p>
      )}

      {[...byLevel.entries()].map(([level, group]) => (
        <section key={level} className="space-y-3">
          <h2 className="text-lg font-semibold">{hskLevelLabel(level)}</h2>
          <ReorderList
            spec={{ kind: "content", model: "hanzi", hskLevel: level }}
            items={group.map((c) => ({
              id: c.id,
              content: (
                <Card>
                  <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start">
                    {c.imageUrl && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={c.imageUrl}
                          alt={c.character}
                          className="h-16 w-16 shrink-0 rounded object-cover"
                        />
                      </>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-2xl font-chinese font-bold ${toneColor(c.tone)}`}>{c.character}</span>
                        <span className="font-pinyin text-sm text-muted-foreground">{c.pinyin}</span>
                      </div>
                      <div className="text-sm">{c.meaning}</div>
                      <div className="text-xs text-muted-foreground">Số nét: {c.strokeCount} · Thanh {c.tone}</div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <PublishToggle model="hanzi" id={c.id} published={c.published} />
                        <form action={async () => { "use server"; await deleteHanziAction(c.id); }}>
                          <Button type="submit" size="sm" variant="outline" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" /> Xoá
                          </Button>
                        </form>
                      </div>

                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Sửa</summary>
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            await updateHanziAction(fd);
                          }}
                          className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <div className="space-y-1">
                            <Label>Chữ Hán</Label>
                            <Input name="character" className="font-chinese text-xl" maxLength={1} defaultValue={c.character} required />
                          </div>
                          <div className="space-y-1">
                            <Label>Pinyin</Label>
                            <Input name="pinyin" className="font-pinyin" defaultValue={c.pinyin} required />
                          </div>
                          <div className="space-y-1">
                            <Label>Thanh điệu (0-4)</Label>
                            <Input name="tone" type="number" min="0" max="4" defaultValue={c.tone} required />
                          </div>
                          <div className="space-y-1">
                            <Label>Nghĩa</Label>
                            <Input name="meaning" defaultValue={c.meaning} required />
                          </div>
                          <div className="space-y-1">
                            <Label>HSK Level</Label>
                            <select name="hskLevel" defaultValue={c.hskLevel} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
                              {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label>Số nét</Label>
                            <Input name="strokeCount" type="number" defaultValue={c.strokeCount} required />
                          </div>
                          <div className="space-y-1 col-span-2 sm:col-span-4">
                            <Label>Tải ảnh minh hoạ lên</Label>
                            <ImageUpload name="imageUrl" defaultValue={c.imageUrl} />
                          </div>
                          <div className="col-span-2 sm:col-span-4">
                            <Button type="submit" size="sm">Lưu</Button>
                          </div>
                        </form>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              ),
            }))}
          />
        </section>
      ))}
    </div>
  );
}
