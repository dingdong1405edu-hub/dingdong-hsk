import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Headphones } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

const QTYPE_LABEL: Record<string, string> = {
  MCQ: "Trắc nghiệm",
  FILL_BLANK: "Điền chỗ trống",
  TRUE_FALSE: "Đúng / Sai",
  MATCHING: "Nối",
  SHORT_ANSWER: "Trả lời ngắn",
};

export default async function ListeningPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tests = await db.listeningTest.findMany({
    where: { published: true }, // ẩn đề nháp khỏi học viên
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    include: { questions: { select: { type: true } } },
  });

  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: "LISTENING" },
    select: { refId: true, score: true },
  });
  const countMap = new Map<string, number>();
  const bestMap = new Map<string, number>();
  for (const a of attempts) {
    countMap.set(a.refId, (countMap.get(a.refId) ?? 0) + 1);
    if (a.score != null) bestMap.set(a.refId, Math.max(bestMap.get(a.refId) ?? 0, a.score));
  }

  const unattempted = tests.filter((t) => !countMap.has(t.id));
  const pool = unattempted.length ? unattempted : tests;
  const randomHref = pool.length
    ? `/listening/${pool[Math.floor(Math.random() * pool.length)].id}`
    : undefined;

  return (
    <PracticeHub
      accent="teal"
      icon={<Headphones className="h-7 w-7" />}
      decoChar="听"
      title="Nghe hiểu"
      subtitle="Nghe audio tiếng Trung và trả lời câu hỏi theo format HSK"
      randomHref={randomHref}
      tips={[
        "Mỗi bài có audio + câu hỏi. Số lần nghe giới hạn theo cấp độ (HSK1-2: 3 lần, còn lại 2 lần).",
        "Có thể đổi tốc độ phát 0.75x – 1.5x để luyện dần.",
        "Transcript chỉ mở sau khi bạn nộp bài.",
        "AI ưu tiên bài bạn chưa làm gần đây.",
      ]}
      gridTitle="Hoặc tự chọn đề"
      gridSubtitle="Nhấn vào đề bạn muốn làm."
    >
      {tests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tests.map((test) => {
            const types = [...new Set(test.questions.map((q) => QTYPE_LABEL[q.type] ?? q.type))];
            return (
              <TestCard
                key={test.id}
                href={`/listening/${test.id}`}
                title={test.title}
                level={test.hskLevel}
                tags={types.length ? types : ["Nghe hiểu"]}
                meta={`${test.questions.length} câu hỏi`}
                attempts={countMap.get(test.id) ?? 0}
                score={bestMap.get(test.id) ?? null}
                seed={test.id}
                imageUrl={test.imageUrl}
              />
            );
          })}
        </div>
      )}
    </PracticeHub>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
      <Headphones className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Chưa có bài nghe nào.</p>
    </div>
  );
}
