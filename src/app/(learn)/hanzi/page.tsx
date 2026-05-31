import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hskLevelLabel, toneColor } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";
import { CheckCircle2 } from "lucide-react";

const HSK_LEVELS = Object.values(HSKLevel);

export default async function HanziPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { hskLevel: true },
  });
  if (!user) redirect("/login");

  const characters = await db.hanziCharacter.findMany({
    orderBy: [{ hskLevel: "asc" }],
    include: {
      progress: { where: { userId: session.user.id } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Luyện viết chữ Hán</h1>
      {HSK_LEVELS.map((level) => {
        const chars = characters.filter((c) => c.hskLevel === level);
        if (chars.length === 0) return null;
        return (
          <div key={level}>
            <h2 className="text-lg font-semibold mb-3">{hskLevelLabel(level)}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-3">
              {chars.map((char) => {
                const mastered = char.progress.some((p) => p.mastered);
                return (
                  <Link key={char.id} href={`/hanzi/${char.id}`}>
                    <Card className="hover:shadow-md transition-all hover:scale-105 cursor-pointer relative">
                      {mastered && (
                        <CheckCircle2 className="absolute top-1 right-1 h-4 w-4 text-green-500" />
                      )}
                      <CardContent className="p-3 text-center">
                        <div className={`text-3xl font-chinese font-bold ${toneColor(char.tone)}`}>
                          {char.character}
                        </div>
                        <div className="font-pinyin text-xs text-muted-foreground mt-1">
                          {char.pinyin}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                          {char.meaning}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
