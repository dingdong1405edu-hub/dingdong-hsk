import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SpellCheck, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

export default async function GrammarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const units = await db.grammarUnit.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        include: { progress: { where: { userId: session.user.id, completed: true } } },
        orderBy: { order: "asc" },
      },
    },
  });

  const withStats = units.map((u) => {
    const total = u.lessons.length;
    const done = u.lessons.filter((l) => l.progress.length > 0).length;
    return { ...u, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const next = withStats.find((u) => u.done < u.total) ?? withStats[0];
  const randomHref = next ? `/grammar/${next.id}` : undefined;

  return (
    <PracticeHub
      accent="violet"
      icon={<SpellCheck className="h-7 w-7" />}
      decoChar="语"
      title="Học ngữ pháp"
      subtitle="Nắm cấu trúc câu tiếng Trung qua các bài tập tương tác ngắn"
      randomHref={randomHref}
      randomLabel="Học tiếp bài đang dở"
      tips={[
        "Mỗi đơn vị gồm nhiều bài tập: điền chỗ trống, sắp xếp câu, dịch câu.",
        "Có ví dụ minh hoạ kèm pinyin và nghĩa tiếng Việt.",
        "Trả lời sai sẽ mất 1 tim ❤️.",
        "Hoàn thành bài học để cộng XP và mở khoá bài tiếp theo.",
      ]}
      gridTitle="Các đơn vị ngữ pháp"
      gridSubtitle="Nhấn vào một đơn vị để bắt đầu học."
    >
      {withStats.length > 0 && (
        <Link href="/grammar/review" className="mb-4 block">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white p-4 transition-colors hover:border-violet-300">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Repeat className="h-5 w-5" />
              </div>
              <div>
                <div className="font-bold">Ôn ngữ pháp</div>
                <p className="text-sm text-muted-foreground">
                  Tổng hợp flashcard &amp; minigame của mọi bài để ôn tập một thể.
                </p>
              </div>
            </div>
            <Button variant="outline" className="shrink-0 border-violet-300 text-violet-700">
              Ôn tập
            </Button>
          </div>
        </Link>
      )}
      {withStats.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {withStats.map((u) => (
            <TestCard
              key={u.id}
              href={`/grammar/${u.id}`}
              title={u.title}
              level={u.hskLevel}
              tags={[u.titleZh]}
              meta={`${u.done}/${u.total} bài học`}
              score={u.pct}
              seed={u.id}
              imageUrl={u.imageUrl}
            />
          ))}
        </div>
      )}
    </PracticeHub>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
      <SpellCheck className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Chưa có đơn vị ngữ pháp nào.</p>
    </div>
  );
}
