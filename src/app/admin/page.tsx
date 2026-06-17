import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hskLevelLabel, cn } from "@/lib/utils";
import {
  Users,
  BookOpen,
  SpellCheck,
  PenTool,
  BookText,
  Headphones,
  PenLine,
  Mic,
  Library,
  Activity,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export default async function AdminPage() {
  const [
    userCount,
    vocabCount,
    grammarCount,
    hanziCount,
    readingCount,
    listeningCount,
    writingCount,
    speakingCount,
    materialCount,
    attemptCount,
    recentUsers,
  ] = await Promise.all([
    db.user.count(),
    db.vocabUnit.count(),
    db.grammarUnit.count(),
    db.hanziCharacter.count(),
    db.readingTest.count(),
    db.listeningTest.count(),
    db.writingTask.count(),
    db.speakingSet.count(),
    db.material.count(),
    db.attempt.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, role: true, hskLevel: true, createdAt: true },
    }),
  ]);

  const sections: { href: string; label: string; icon: LucideIcon; count: number; cls: string }[] = [
    { href: "/admin/vocab", label: "Từ vựng", icon: BookOpen, count: vocabCount, cls: "bg-blue-100 text-blue-600" },
    { href: "/admin/grammar", label: "Ngữ pháp", icon: SpellCheck, count: grammarCount, cls: "bg-violet-100 text-violet-600" },
    { href: "/admin/hanzi", label: "Chữ Hán", icon: PenTool, count: hanziCount, cls: "bg-amber-100 text-amber-600" },
    { href: "/admin/reading", label: "Đọc hiểu", icon: BookText, count: readingCount, cls: "bg-emerald-100 text-emerald-600" },
    { href: "/admin/listening", label: "Nghe hiểu", icon: Headphones, count: listeningCount, cls: "bg-teal-100 text-teal-600" },
    { href: "/admin/writing", label: "Viết luận", icon: PenLine, count: writingCount, cls: "bg-rose-100 text-rose-600" },
    { href: "/admin/speaking", label: "Luyện nói", icon: Mic, count: speakingCount, cls: "bg-indigo-100 text-indigo-600" },
    { href: "/admin/materials", label: "Tài liệu", icon: Library, count: materialCount, cls: "bg-fuchsia-100 text-fuchsia-600" },
    { href: "/admin/users", label: "Người dùng", icon: Users, count: userCount, cls: "bg-sky-100 text-sky-600" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tổng quan quản trị</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quản lý nội dung bài học và người dùng của DingDong HSK.</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} cls="bg-sky-100 text-sky-600" label="Người dùng" value={userCount} />
        <StatCard
          icon={BookOpen}
          cls="bg-blue-100 text-blue-600"
          label="Bài học / Đơn vị"
          value={vocabCount + grammarCount + hanziCount}
        />
        <StatCard
          icon={BookText}
          cls="bg-emerald-100 text-emerald-600"
          label="Đề luyện tập"
          value={readingCount + listeningCount + writingCount + speakingCount}
        />
        <StatCard icon={Activity} cls="bg-amber-100 text-amber-600" label="Lượt làm bài" value={attemptCount} />
      </div>

      {/* Manage sections */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quản lý nội dung</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", s.cls)}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.count} mục</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Người dùng mới
            <Link href="/admin/users" className="text-xs font-medium text-primary hover:underline">
              Xem tất cả
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentUsers.map((u) => {
              const display = u.name ?? u.email.split("@")[0];
              return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {display.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{display}</div>
                    <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {hskLevelLabel(u.hskLevel)}
                  </span>
                  {u.role === "ADMIN" && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      Admin
                    </span>
                  )}
                </div>
              );
            })}
            {recentUsers.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chưa có người dùng.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  cls,
  label,
  value,
}: {
  icon: LucideIcon;
  cls: string;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", cls)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold leading-tight">{value.toLocaleString()}</div>
        </div>
      </CardContent>
    </Card>
  );
}
