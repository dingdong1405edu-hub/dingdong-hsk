import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PenTool, CheckCircle2 } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { hskBadgeClass, hskLevelLabel, toneColor, cn } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";

const HSK_LEVELS = Object.values(HSKLevel);

export default async function HanziPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const characters = await db.hanziCharacter.findMany({
    orderBy: [{ hskLevel: "asc" }],
    include: { progress: { where: { userId: session.user.id } } },
  });

  const randomHref = characters.length
    ? `/hanzi/${characters[Math.floor(Math.random() * characters.length)].id}`
    : undefined;

  return (
    <PracticeHub
      accent="amber"
      icon={<PenTool className="h-7 w-7" />}
      decoChar="字"
      title="Chữ Hán"
      subtitle="Luyện thứ tự nét bút và viết lại từng chữ trong ô 田字格"
      randomHref={randomHref}
      randomLabel="Luyện 1 chữ ngẫu nhiên"
      tips={[
        "Xem animation thứ tự nét bút (stroke order) cho từng chữ.",
        "Chế độ quiz: tự vẽ từng nét rồi đối chiếu với đáp án.",
        "Mỗi chữ có pinyin, thanh điệu (tô màu) và nghĩa tiếng Việt.",
        "Chữ đã thuộc sẽ được đánh dấu ✓.",
      ]}
      gridTitle="Danh sách chữ Hán"
      gridSubtitle="Nhấn vào một chữ để luyện viết."
    >
      {characters.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
          <PenTool className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Chưa có chữ Hán nào.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {HSK_LEVELS.map((level) => {
            const chars = characters.filter((c) => c.hskLevel === level);
            if (chars.length === 0) return null;
            return (
              <div key={level}>
                <span className={cn("mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", hskBadgeClass(level))}>
                  {hskLevelLabel(level)}
                </span>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8">
                  {chars.map((char) => {
                    const mastered = char.progress.some((p) => p.mastered);
                    return (
                      <Link key={char.id} href={`/hanzi/${char.id}`} className="group">
                        <div className="relative rounded-2xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                          {char.imageUrl && (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={char.imageUrl} alt={char.character} loading="lazy" className="mb-2 h-12 w-full rounded-lg object-cover" />
                            </>
                          )}
                          {mastered && (
                            <CheckCircle2 className="absolute right-1.5 top-1.5 h-4 w-4 text-emerald-500" />
                          )}
                          <div className={cn("font-chinese text-3xl font-bold", toneColor(char.tone))}>
                            {char.character}
                          </div>
                          <div className="font-pinyin mt-1 text-xs text-muted-foreground">{char.pinyin}</div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">{char.meaning}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PracticeHub>
  );
}
