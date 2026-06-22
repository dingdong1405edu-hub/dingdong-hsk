import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, BookText, Headphones, PenLine, ArrowRight } from "lucide-react";
import { PracticeHub } from "@/components/learn/practice-hub";
import { examComposition } from "@/lib/mock-exam";
import { ExamHub, type ExamCardData } from "./exam-hub";
import type { Skill } from "@prisma/client";

export default async function ExamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  const [user, exams, attempts] = await Promise.all([
    db.user.findUnique({ where: { id: session.user.id }, select: { hskLevel: true } }),
    db.mockExam.findMany({
      where: isAdmin ? {} : { published: true },
      orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
      include: {
        sections: {
          orderBy: { order: "asc" },
          select: {
            skill: true,
            parts: { select: { writingPrompt: true, _count: { select: { questions: true } } } },
          },
        },
      },
    }),
    db.attempt.findMany({
      where: { userId: session.user.id, skill: "MOCK" },
      select: { refId: true, score: true },
    }),
  ]);

  const bestMap = new Map<string, number>();
  for (const a of attempts) {
    if (a.score != null) bestMap.set(a.refId, Math.max(bestMap.get(a.refId) ?? 0, a.score));
  }

  const cards: ExamCardData[] = exams.map((e) => {
    const skills = [...new Set(e.sections.map((s) => s.skill))] as Skill[];
    const questionCount = e.sections.reduce(
      (a, s) => a + s.parts.reduce((b, p) => b + p._count.questions, 0),
      0,
    );
    const essayCount = e.sections.reduce(
      (a, s) => a + s.parts.filter((p) => p.writingPrompt).length,
      0,
    );
    const metaParts = [`${questionCount} câu`];
    if (essayCount > 0) metaParts.push(`${essayCount} bài viết`);
    if (e.totalTime) metaParts.push(`${Math.round(e.totalTime / 60)} phút`);
    return {
      id: e.id,
      title: e.title,
      hskLevel: e.hskLevel,
      composition: examComposition(skills) || "Đề thi",
      meta: metaParts.join(" · "),
      bestScore: bestMap.get(e.id) ?? null,
      isDraft: !e.published,
    };
  });

  return (
    <PracticeHub
      accent="red"
      icon={<GraduationCap className="h-7 w-7" />}
      decoChar="试"
      title="Thi thử"
      subtitle="Làm trọn bộ đề theo đúng format máy thi HSK để đánh giá trình độ hiện tại"
      tips={[
        "Chọn cấp độ HSK rồi làm trọn bộ đề: Nghe hiểu · Đọc hiểu · Viết (HSK 3–6).",
        "Có đồng hồ đếm ngược và tự nộp khi hết giờ như thi thật.",
        "Hệ thống chấm tự động phần Nghe/Đọc và chấm AI phần Viết, cho điểm từng phần.",
        "Điểm cao nhất của bạn được lưu lại trên từng đề để theo dõi tiến bộ.",
      ]}
    >
      <div className="space-y-8">
        <ExamHub exams={cards} defaultLevel={user?.hskLevel ?? "HSK1"} />

        {/* Luyện từng kỹ năng riêng lẻ */}
        <div>
          <h2 className="mb-3 text-lg font-bold">Luyện từng kỹ năng riêng lẻ</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <PracticeLink href="/reading" icon={<BookText className="h-5 w-5 text-emerald-600" />} label="Đọc hiểu" />
            <PracticeLink href="/listening" icon={<Headphones className="h-5 w-5 text-teal-600" />} label="Nghe hiểu" />
            <PracticeLink href="/writing" icon={<PenLine className="h-5 w-5 text-violet-600" />} label="Viết luận" />
          </div>
        </div>
      </div>
    </PracticeHub>
  );
}

function PracticeLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-2 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <span className="flex items-center gap-2 font-semibold">
        {icon} {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
