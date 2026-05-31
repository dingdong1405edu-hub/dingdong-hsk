import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Headphones, PenLine, Mic } from "lucide-react";

export default async function AdminPage() {
  const [userCount, readingCount, listeningCount, writingCount, speakingCount, attemptCount] =
    await Promise.all([
      db.user.count(),
      db.readingTest.count(),
      db.listeningTest.count(),
      db.writingTask.count(),
      db.speakingSet.count(),
      db.attempt.count(),
    ]);

  const stats = [
    { label: "Người dùng", value: userCount, icon: Users, color: "text-blue-500" },
    { label: "Bài đọc", value: readingCount, icon: BookOpen, color: "text-amber-500" },
    { label: "Bài nghe", value: listeningCount, icon: Headphones, color: "text-teal-500" },
    { label: "Bài viết", value: writingCount, icon: PenLine, color: "text-rose-500" },
    { label: "Bộ nói", value: speakingCount, icon: Mic, color: "text-indigo-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-6 text-center">
              <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Tổng lượt học</CardTitle></CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">{attemptCount.toLocaleString()}</div>
        </CardContent>
      </Card>
    </div>
  );
}
