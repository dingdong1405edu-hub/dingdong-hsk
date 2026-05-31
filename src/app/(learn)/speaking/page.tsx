import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hskLevelLabel } from "@/lib/utils";
import { Mic } from "lucide-react";

export default async function SpeakingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sets = await db.speakingSet.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Luyện nói HSKK</h1>
      <p className="text-muted-foreground text-sm">
        Ba phần: Lặp câu → Đọc đoạn văn → Trả lời câu hỏi. AI chấm phát âm, thanh điệu, lưu loát.
      </p>
      {sets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mic className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Chưa có bộ câu nào.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sets.map((set) => (
            <Card key={set.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold">{set.title || `HSKK Bài ${set.id.slice(-4)}`}</h3>
                  </div>
                  <Badge variant="outline">{hskLevelLabel(set.hskLevel)}</Badge>
                </div>
                <Link href={`/speaking/${set.id}`}>
                  <Button size="sm">Luyện tập</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
