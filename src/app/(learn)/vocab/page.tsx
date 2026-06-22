import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

export default async function VocabPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [units, dueCount] = await Promise.all([
    db.vocabUnit.findMany({
      where: { published: true }, // ẩn unit nháp khỏi học viên
      orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
      include: {
        lessons: {
          where: { published: true }, // ẩn bài nháp khỏi học viên
          include: { progress: { where: { userId: session.user.id, completed: true } } },
          orderBy: { order: "asc" },
        },
      },
    }),
    db.vocabReview.count({ where: { userId: session.user.id, dueAt: { lte: new Date() } } }),
  ]);

  const withStats = units.map((u) => {
    const total = u.lessons.length;
    const done = u.lessons.filter((l) => l.progress.length > 0).length;
    return { ...u, total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const next = withStats.find((u) => u.done < u.total) ?? withStats[0];
  const randomHref = next ? `/vocab/${next.id}` : undefined;

  return (
    <PracticeHub
      accent="blue"
      icon={<BookOpen className="h-7 w-7" />}
      decoChar="词"
      title="Từ vựng"
      subtitle="Học từ vựng HSK 1–6 theo phong cách Duolingo, có XP và streak"
      randomHref={randomHref}
      randomLabel="Học tiếp bài đang dở"
      tips={[
        "Mỗi đơn vị (unit) gồm nhiều bài học ngắn, mở khoá lần lượt.",
        "Dạng bài: nối từ, dịch câu, chọn thanh điệu, gõ chữ Hán, nối pinyin.",
        "Trả lời sai sẽ mất 1 tim ❤️ — hết tim cần đợi hồi hoặc luyện lại.",
        "Hoàn thành bài học để cộng XP và giữ chuỗi ngày học.",
      ]}
      gridTitle="Các đơn vị từ vựng"
      gridSubtitle="Nhấn vào một đơn vị để bắt đầu học."
    >
      {dueCount > 0 && (
        <Link
          href="/vocab/review"
          className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 transition-colors hover:border-amber-300"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">Ôn tập tổng hợp</div>
              <p className="text-sm text-muted-foreground">
                {dueCount} từ đến hạn ôn — lặp lại ngắt quãng để nhớ lâu.
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-amber-600" />
        </Link>
      )}
      {withStats.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {withStats.map((u) => (
            <TestCard
              key={u.id}
              href={`/vocab/${u.id}`}
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
      <BookOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Chưa có đơn vị từ vựng nào.</p>
    </div>
  );
}
