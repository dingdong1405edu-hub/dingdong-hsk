import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel } from "@/lib/utils";
import { deleteSpeakingAction } from "@/server/actions/admin";
import { Trash2, Plus } from "lucide-react";
import { db as prisma } from "@/lib/db";
import { HSKLevel } from "@prisma/client";
import { revalidatePath } from "next/cache";

async function createSpeakingAction(fd: FormData) {
  "use server";
  await prisma.speakingSet.create({
    data: {
      title: fd.get("title") as string,
      hskLevel: fd.get("hskLevel") as HSKLevel,
      part1Sentences: JSON.parse(fd.get("part1Sentences") as string),
      part2Passage: JSON.parse(fd.get("part2Passage") as string),
      part3Questions: JSON.parse(fd.get("part3Questions") as string),
    },
  });
  revalidatePath("/admin/speaking");
}

export default async function AdminSpeakingPage() {
  const sets = await db.speakingSet.findMany({ orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }] });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bộ luyện nói HSKK</h1>
      <Card>
        <CardHeader><CardTitle className="text-base"><Plus className="h-4 w-4 inline mr-2" />Thêm bộ nói</CardTitle></CardHeader>
        <CardContent>
          <form action={createSpeakingAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tiêu đề</Label>
                <Input name="title" placeholder="HSKK HSK1 - Bài 1" />
              </div>
              <div className="space-y-1">
                <Label>Cấp độ HSK</Label>
                <select name="hskLevel" className="flex h-9 w-full rounded-md border px-3 py-1 text-sm">
                  {["HSK1","HSK2","HSK3","HSK4","HSK5","HSK6"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Part 1 Sentences (JSON array)</Label>
              <textarea
                name="part1Sentences"
                className="flex min-h-24 w-full rounded-md border px-3 py-2 text-xs font-mono"
                defaultValue={`[{"text":"你好","pinyin":"Nǐ hǎo"}]`}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Part 2 Passage (JSON object)</Label>
              <textarea
                name="part2Passage"
                className="flex min-h-16 w-full rounded-md border px-3 py-2 text-xs font-mono"
                defaultValue={`{"text":"段落内容","pinyin":"Duànluò nèiróng"}`}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Part 3 Questions (JSON array)</Label>
              <textarea
                name="part3Questions"
                className="flex min-h-16 w-full rounded-md border px-3 py-2 text-xs font-mono"
                defaultValue={`[{"question":"你好吗？","pinyin":"Nǐ hǎo ma?"}]`}
                required
              />
            </div>
            <Button type="submit">Tạo bộ nói</Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {sets.map((set) => (
          <Card key={set.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{set.title || set.id}</div>
                <Badge variant="outline" className="mt-1">{hskLevelLabel(set.hskLevel)}</Badge>
              </div>
              <form action={async () => { "use server"; await deleteSpeakingAction(set.id); }}>
                <Button size="sm" variant="destructive" type="submit"><Trash2 className="h-4 w-4" /></Button>
              </form>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
