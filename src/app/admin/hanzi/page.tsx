import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel, toneColor } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { Plus, Trash2 } from "lucide-react";
import { db as prisma } from "@/lib/db";

async function createHanziAction(fd: FormData) {
  "use server";
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
    },
  });
  revalidatePath("/admin/hanzi");
}

async function deleteHanziAction(id: string) {
  "use server";
  await prisma.hanziCharacter.delete({ where: { id } });
  revalidatePath("/admin/hanzi");
}

export default async function AdminHanziPage() {
  const chars = await db.hanziCharacter.findMany({ orderBy: [{ hskLevel: "asc" }] });

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
              <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Số nét</Label>
              <Input name="strokeCount" type="number" defaultValue="5" required />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <Button type="submit" className="w-full">Thêm chữ</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {chars.map((c) => (
          <div key={c.id} className="border rounded-lg p-2 text-center group relative">
            <div className={`text-2xl font-chinese font-bold ${toneColor(c.tone)}`}>{c.character}</div>
            <div className="text-xs font-pinyin text-muted-foreground">{c.pinyin}</div>
            <form action={async () => { "use server"; await deleteHanziAction(c.id); }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100">
              <button type="submit" className="text-red-400 hover:text-red-600">
                <Trash2 className="h-3 w-3" />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
