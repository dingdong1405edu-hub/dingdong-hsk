import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BookText } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

const QTYPE_LABEL: Record<string, string> = {
  MCQ: "Trắc nghiệm",
  FILL_BLANK: "Điền chỗ trống",
  TRUE_FALSE: "Đúng / Sai / Không đề cập",
  MATCHING: "Nối tiêu đề",
  SHORT_ANSWER: "Trả lời ngắn",
};

export default async function ReadingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tests = await db.readingTest.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
    include: { questions: { select: { type: true } } },
  });

  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: "READING" },
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
    ? `/reading/${pool[Math.floor(Math.random() * pool.length)].id}`
    : undefined;

  return (
    <PracticeHub
      accent="green"
      icon={<BookText className="h-7 w-7" />}
      decoChar="读"
      title="Đọc hiểu"
      subtitle="1 bài đọc mỗi lần luyện tập · không giới hạn thời gian"
      randomHref={randomHref}
      tips={[
        "Mỗi lần luyện 1 bài đọc với nhiều câu hỏi (Trắc nghiệm / Nối tiêu đề / Điền chỗ trống / Đúng–Sai).",
        "Không bấm giờ — hệ thống chỉ đếm thời gian bạn đã làm.",
        "AI ưu tiên bài bạn chưa làm gần đây, tránh trùng lặp.",
        "Sau khi nộp, hệ thống chấm điểm và hiện đáp án + giải thích từng câu.",
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
                href={`/reading/${test.id}`}
                title={test.title}
                level={test.hskLevel}
                tags={types}
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
      <BookText className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Chưa có bài đọc nào. Quản trị viên sẽ thêm bài sớm!</p>
    </div>
  );
}
