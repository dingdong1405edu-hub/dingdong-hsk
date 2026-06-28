import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Mic, MessagesSquare } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";
import { BaoBuddy } from "@/components/marketing/bao-buddy";

export default async function SpeakingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [sets, topics] = await Promise.all([
    db.speakingSet.findMany({
      where: { published: true }, // ẩn bộ nháp khỏi học viên
      orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
    db.speakingTopic.findMany({
      where: { published: true },
      orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  // Attempt.skill = SPEAKING cho cả bộ đề lẫn chủ đề; refId là cuid riêng nên không
  // đụng nhau — dùng chung map đếm lượt làm + điểm cao nhất.
  const attempts = await db.attempt.findMany({
    where: { userId: session.user.id, skill: "SPEAKING" },
    select: { refId: true, score: true },
  });
  const countMap = new Map<string, number>();
  const bestMap = new Map<string, number>();
  for (const a of attempts) {
    countMap.set(a.refId, (countMap.get(a.refId) ?? 0) + 1);
    if (a.score != null) bestMap.set(a.refId, Math.max(bestMap.get(a.refId) ?? 0, a.score));
  }

  // "AI chọn đề ngẫu nhiên" gộp cả bộ đề 3 phần lẫn chủ đề nói; ưu tiên đề chưa làm.
  const allItems = [
    ...topics.map((t) => ({ id: t.id, href: `/speaking/topic/${t.id}` })),
    ...sets.map((s) => ({ id: s.id, href: `/speaking/${s.id}` })),
  ];
  const unstarted = allItems.filter((i) => !countMap.has(i.id));
  const list = unstarted.length ? unstarted : allItems;
  const randomHref = list.length
    ? list[Math.floor(Math.random() * list.length)].href
    : undefined;

  return (
    <PracticeHub
      accent="indigo"
      icon={<Mic className="h-7 w-7" />}
      decoChar="说"
      title="Luyện nói HSKK"
      subtitle="Ghi âm trực tiếp · AI chấm phát âm, thanh điệu và độ lưu loát"
      randomHref={randomHref}
      tips={[
        "Phần 1 — Lặp câu (复述): nghe rồi ghi âm lặp lại.",
        "Phần 2 — Đọc đoạn văn (朗读): đọc to đoạn văn (có thể bật pinyin).",
        "Phần 3 — Trả lời câu hỏi (回答问题): suy nghĩ 10s rồi trả lời tự do.",
        "Nói theo chủ đề (命题说话): nghe giám khảo hỏi → trả lời một đoạn dài → AI chấm chi tiết & sửa lỗi.",
      ]}
      gridTitle="Hoặc tự chọn bộ đề"
      gridSubtitle="Nhấn vào bộ đề bạn muốn luyện."
    >
      <div className="space-y-8">
        {/* Nói theo chủ đề */}
        {topics.length > 0 && (
          <section className="space-y-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <MessagesSquare className="h-5 w-5 text-indigo-600" /> Nói theo chủ đề
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Giám khảo đặt câu hỏi mở — bạn trả lời thành một đoạn dài, AI chấm chi tiết & sửa lỗi.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {topics.map((t) => (
                <TestCard
                  key={t.id}
                  href={`/speaking/topic/${t.id}`}
                  title={t.topic || t.title || `Chủ đề · ${t.id.slice(-4)}`}
                  level={t.hskLevel}
                  tags={["Trả lời mở", "AI chấm chi tiết", "Sửa lỗi"]}
                  attempts={countMap.get(t.id) ?? 0}
                  score={bestMap.get(t.id) ?? null}
                  seed={t.id}
                  imageUrl={t.imageUrl}
                />
              ))}
            </div>
          </section>
        )}

        {/* Bộ đề 3 phần */}
        <section className="space-y-3">
          {topics.length > 0 && (
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Mic className="h-5 w-5 text-indigo-600" /> Bộ đề 3 phần (HSKK)
            </h2>
          )}
          {sets.length === 0 && topics.length === 0 ? (
            <EmptyState />
          ) : sets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có bộ đề 3 phần nào.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sets.map((set) => (
                <TestCard
                  key={set.id}
                  href={`/speaking/${set.id}`}
                  title={set.title || `HSKK · Bộ ${set.id.slice(-4)}`}
                  level={set.hskLevel}
                  tags={["Lặp câu", "Đọc đoạn văn", "Trả lời câu hỏi"]}
                  attempts={countMap.get(set.id) ?? 0}
                  score={bestMap.get(set.id) ?? null}
                  seed={set.id}
                  imageUrl={set.imageUrl}
                  pdfHref={`/speaking-pdf/${set.id}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </PracticeHub>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
      <BaoBuddy size={72} pose="idle" className="mx-auto mb-3" />
      <p>Chưa có bộ đề nói nào.</p>
    </div>
  );
}
