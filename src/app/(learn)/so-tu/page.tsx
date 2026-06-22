import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { BookMarked } from "lucide-react";
import { SavedWordList, type SavedWordItem } from "@/components/learn/vocab/saved-word-list";
import { BaoBuddy } from "@/components/marketing/bao-buddy";

export const dynamic = "force-dynamic";

/** "Sổ từ" — danh sách từ học viên đã lưu khi tra cứu (đọc hiểu, …). */
export default async function SoTuPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const rows = await db.savedWord.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const words: SavedWordItem[] = rows.map((w) => ({
    id: w.id,
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    meaning: w.meaning,
    hskLevel: w.hskLevel,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookMarked className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sổ từ</h1>
          <p className="text-sm text-muted-foreground">
            Những từ bạn lưu lại khi tra cứu. Tổng cộng {words.length} từ.
          </p>
        </div>
      </div>

      {words.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <BaoBuddy size={72} pose="idle" className="mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Chưa có từ nào. Khi làm bài đọc hiểu, bấm vào một chữ rồi chọn “Lưu vào sổ từ”.
          </p>
        </div>
      ) : (
        <SavedWordList words={words} />
      )}
    </div>
  );
}
