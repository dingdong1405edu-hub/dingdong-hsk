import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Mic } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { TestCard } from "@/components/learn/test-card";
import { BaoBuddy } from "@/components/marketing/bao-buddy";

export default async function SpeakingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sets = await db.speakingSet.findMany({
    where: { published: true }, // ẩn bộ nháp khỏi học viên
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });

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

  const pool = sets.filter((s) => !countMap.has(s.id));
  const list = pool.length ? pool : sets;
  const randomHref = list.length
    ? `/speaking/${list[Math.floor(Math.random() * list.length)].id}`
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
        "AI chấm 3 tiêu chí: Phát âm (发音), Thanh điệu (声调), Lưu loát (流利度).",
      ]}
      gridTitle="Hoặc tự chọn bộ đề"
      gridSubtitle="Nhấn vào bộ đề bạn muốn luyện."
    >
      {sets.length === 0 ? (
        <EmptyState />
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
