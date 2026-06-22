import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { SpellCheck } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

export default async function GrammarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const units = await db.grammarUnit.findMany({
    where: { published: true }, // ẩn unit nháp khỏi học viên
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }],
    include: {
      lessons: {
        where: { published: true }, // ẩn bài nháp khỏi học viên
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
      title="Ngữ pháp"
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
