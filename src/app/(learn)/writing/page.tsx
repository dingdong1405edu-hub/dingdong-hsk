import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PenLine } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";

const TYPE_LABEL: Record<string, string> = {
  FREE: "Viết tự do",
  GUIDED: "Có hướng dẫn",
  PICTURE_DESCRIPTION: "Mô tả ảnh",
};

export default async function WritingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await db.writingTask.findMany({
    orderBy: [{ hskLevel: "asc" }, { createdAt: "desc" }],
  });

  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: "WRITING" },
    select: { refId: true, score: true },
  });
  const countMap = new Map<string, number>();
  const bestMap = new Map<string, number>();
  for (const a of attempts) {
    countMap.set(a.refId, (countMap.get(a.refId) ?? 0) + 1);
    if (a.score != null) bestMap.set(a.refId, Math.max(bestMap.get(a.refId) ?? 0, a.score));
  }

  const pool = tasks.filter((t) => !countMap.has(t.id));
  const randomHref = (pool.length ? pool : tasks).length
    ? `/writing/${(pool.length ? pool : tasks)[Math.floor(Math.random() * (pool.length ? pool : tasks).length)].id}`
    : undefined;

  return (
    <PracticeHub
      accent="rose"
      icon={<PenLine className="h-7 w-7" />}
      decoChar="写"
      title="Viết luận"
      subtitle="AI chấm ngữ pháp, từ vựng và tính mạch lạc cho bài viết của bạn"
      randomHref={randomHref}
      randomLabel="AI chọn đề ngẫu nhiên"
      tips={[
        "Viết trực tiếp trên trình soạn thảo, có đếm số chữ Hán realtime.",
        "AI chấm 3 tiêu chí: Ngữ pháp (语法), Từ vựng (词汇), Mạch lạc (连贯).",
        "Kết quả gồm điểm tổng, lỗi sai được highlight và bản sửa mẫu.",
        "Mỗi đề có số chữ tối thiểu khác nhau theo cấp độ HSK.",
      ]}
      gridTitle="Hoặc tự chọn đề"
      gridSubtitle="Nhấn vào đề bạn muốn viết."
    >
      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks.map((task) => (
            <TestCard
              key={task.id}
              href={`/writing/${task.id}`}
              title={task.prompt}
              level={task.hskLevel}
              tags={[TYPE_LABEL[task.taskType] ?? task.taskType, `Tối thiểu ${task.minChars} chữ`]}
              meta={`${Math.round(task.timeLimit / 60)} phút`}
              attempts={countMap.get(task.id) ?? 0}
              score={bestMap.get(task.id) ?? null}
              seed={task.id}
              imageUrl={task.imageUrl}
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
      <PenLine className="mx-auto mb-3 h-12 w-12 opacity-30" />
      <p>Chưa có đề viết nào.</p>
    </div>
  );
}
