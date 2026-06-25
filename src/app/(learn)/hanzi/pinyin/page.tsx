import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Volume2, Route, Table2, CheckCircle2 } from "lucide-react";
import { PINYIN_LESSON_SUMMARIES } from "@/lib/pinyin-lessons";
import { PinyinIntro } from "@/components/learn/pinyin/pinyin-intro";
import { PinyinLessonList, type PinyinProgressInfo } from "@/components/learn/pinyin/pinyin-lesson-list";
import { PinyinTable } from "@/components/learn/pinyin/pinyin-table";

export default async function PinyinPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rows = await db.pinyinProgress.findMany({
    where: { userId: session.user.id },
    select: { lessonId: true, completed: true, bestScore: true },
  });
  const progress: Record<string, PinyinProgressInfo> = Object.fromEntries(
    rows.map((r) => [r.lessonId, { completed: r.completed, bestScore: r.bestScore }]),
  );
  const doneCount = rows.filter((r) => r.completed).length;
  const totalLessons = PINYIN_LESSON_SUMMARIES.length;

  return (
    <div className="space-y-6">
      <Link
        href="/hanzi"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Chữ cái & phát âm
      </Link>

      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-400/20 dark:from-amber-500/10 dark:to-transparent sm:p-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-500/15 dark:text-amber-300">
            <Volume2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">
              Học <span className="text-amber-600 dark:text-amber-400">phiên âm</span> cho người mới bắt đầu
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Đã hoàn thành {doneCount}/{totalLessons} bài • Phát âm bằng giọng đọc tiếng Trung của trình duyệt.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-amber-600/[0.06]">
          拼音
        </div>
      </div>

      {/* Giới thiệu */}
      <PinyinIntro />

      {/* Lộ trình học lần lượt */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Route className="h-5 w-5 text-amber-600" /> Lộ trình học lần lượt
        </h2>
        <p className="mb-3 mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-amber-500" /> Học theo thứ tự gợi ý, hoặc nhảy vào bất kỳ bài nào bạn thích.
        </p>
        <PinyinLessonList lessons={PINYIN_LESSON_SUMMARIES} progress={progress} />
      </section>

      {/* Bảng phiên âm đầy đủ */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
          <Table2 className="h-5 w-5 text-amber-600" /> Bảng phiên âm đầy đủ
        </h2>
        <PinyinTable />
      </section>
    </div>
  );
}
