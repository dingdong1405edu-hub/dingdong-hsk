import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { GraduationCap, BookText, Headphones } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

export default async function ExamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [reading, listening] = await Promise.all([
    db.readingTest.findMany({
      orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
      include: { questions: { select: { id: true } } },
    }),
    db.listeningTest.findMany({
      orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
      include: { questions: { select: { id: true } } },
    }),
  ]);

  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: { in: ["READING", "LISTENING"] } },
    select: { refId: true, score: true },
  });
  const bestMap = new Map<string, number>();
  for (const a of attempts) {
    if (a.score != null) bestMap.set(a.refId, Math.max(bestMap.get(a.refId) ?? 0, a.score));
  }

  return (
    <PracticeHub
      accent="red"
      icon={<GraduationCap className="h-7 w-7" />}
      decoChar="试"
      title="Thi thử"
      subtitle="Làm trọn bộ đề theo format HSK để đánh giá trình độ hiện tại"
      tips={[
        "Chọn một đề Đọc hiểu hoặc Nghe hiểu để làm như thi thật.",
        "Hệ thống chấm điểm tự động và lưu vào lịch sử để bạn theo dõi tiến bộ.",
        "Nên làm định kỳ mỗi tuần để đo mức độ sẵn sàng cho kỳ thi HSK.",
        "Điểm cao nhất của bạn được hiển thị trên từng đề.",
      ]}
    >
      <div className="space-y-8">
        <ExamGroup
          title="Đề Đọc hiểu"
          icon={<BookText className="h-5 w-5 text-emerald-600" />}
          empty="Chưa có đề đọc."
          items={reading.map((t) => ({
            id: t.id,
            href: `/reading/${t.id}`,
            title: t.title,
            level: t.hskLevel,
            count: t.questions.length,
            score: bestMap.get(t.id) ?? null,
          }))}
        />
        <ExamGroup
          title="Đề Nghe hiểu"
          icon={<Headphones className="h-5 w-5 text-teal-600" />}
          empty="Chưa có đề nghe."
          items={listening.map((t) => ({
            id: t.id,
            href: `/listening/${t.id}`,
            title: t.title,
            level: t.hskLevel,
            count: t.questions.length,
            score: bestMap.get(t.id) ?? null,
          }))}
        />
      </div>
    </PracticeHub>
  );
}

function ExamGroup({
  title,
  icon,
  empty,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  items: { id: string; href: string; title: string; level: string; count: number; score: number | null }[];
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
        {icon} {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <TestCard
              key={it.id}
              href={it.href}
              title={it.title}
              level={it.level}
              meta={`${it.count} câu hỏi`}
              score={it.score}
              tags={["Thi thử"]}
              seed={it.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
