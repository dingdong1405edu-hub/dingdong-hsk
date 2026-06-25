import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PenTool, CheckCircle2, Sparkles, ArrowRight, Volume2 } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { hskBadgeClass, hskLevelLabel, toneColor, cn } from "@/lib/utils";
import { HSKLevel } from "@prisma/client";

const HSK_LEVELS = Object.values(HSKLevel);

export default async function HanziPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const characters = await db.hanziCharacter.findMany({
    where: { published: true }, // ẩn chữ nháp khỏi học viên
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { character: "asc" }],
    include: { progress: { where: { userId: session.user.id } } },
  });

  const randomHref = characters.length
    ? `/hanzi/${characters[Math.floor(Math.random() * characters.length)].id}`
    : undefined;

  return (
    <PracticeHub
      accent="amber"
      icon={<PenTool className="h-7 w-7" />}
      decoChar="拼"
      title="Chữ cái & phát âm"
      subtitle="Học phiên âm (pinyin) cho người mới bắt đầu và luyện viết chữ Hán"
      randomHref={randomHref}
      randomLabel="Luyện 1 chữ ngẫu nhiên"
      tips={[
        "Mới bắt đầu? Học phần Phiên âm trước để đọc đúng thanh mẫu, vận mẫu và thanh điệu.",
        "Xem nét: animation thứ tự nét bút (stroke order) cho từng chữ Hán.",
        "Viết theo mẫu: viết đè lên nét mờ để quen tay và đúng thứ tự nét.",
        "Tập viết: tự viết lại từ trí nhớ — viết sai nét sẽ được gợi ý ngay.",
        "Mỗi chữ có pinyin, thanh điệu (tô màu) và nghĩa tiếng Việt.",
      ]}
    >
      <div className="space-y-7">
        {/* Featured: Học phiên âm cho người mới bắt đầu */}
        <Link href="/hanzi/pinyin" className="group block">
          <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft-lg dark:border-amber-400/25 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-yellow-500/10 sm:p-6">
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-soft">
                  <Volume2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-extrabold sm:text-xl">Học phiên âm cho người mới bắt đầu</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                      <Sparkles className="h-3 w-3" /> Mới
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Bảng phiên âm đầy đủ + flashcard thanh mẫu, vận mẫu, thanh điệu và các âm dễ lẫn — học như Duolingo.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-soft transition-transform group-hover:translate-x-0.5 sm:self-auto">
                Bắt đầu <ArrowRight className="h-4 w-4" />
              </span>
            </div>
            <div className="pointer-events-none absolute -right-3 -top-6 select-none font-chinese text-[110px] leading-none text-amber-600/10">
              音
            </div>
          </div>
        </Link>

        {/* Luyện viết chữ Hán */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <PenTool className="h-5 w-5 text-amber-600" /> Luyện viết chữ Hán
          </h2>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">Nhấn vào một chữ để xem thứ tự nét và tập viết.</p>

          {characters.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              <BaoBuddy size={72} pose="idle" className="mx-auto mb-3" />
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
                            <div className="relative rounded-2xl border border-border/60 bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
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
        </div>
      </div>
    </PracticeHub>
  );
}
