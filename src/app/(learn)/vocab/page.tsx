import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

export default async function VocabPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const units = await db.vocabUnit.findMany({
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
