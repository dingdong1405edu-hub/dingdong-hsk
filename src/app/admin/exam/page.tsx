import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ReorderList, type ReorderItem } from "@/components/admin/reorder-list";
import { hskLevelLabel } from "@/lib/utils";
import { sectionLabel } from "@/lib/mock-exam";
import { createMockExamAction, deleteMockExamAction } from "@/server/actions/mock-exam";
import { Trash2, Plus, ChevronRight, GraduationCap, Layers } from "lucide-react";
import type { HSKLevel } from "@prisma/client";

const HSK_LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

export default async function AdminExamPage() {
  const exams = await db.mockExam.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    include: {
      sections: {
        orderBy: { order: "asc" },
        select: { skill: true, _count: { select: { parts: true } } },
      },
      _count: { select: { sections: true } },
    },
  });

  const byLevel = new Map<HSKLevel, typeof exams>();
  for (const e of exams) {
    if (!byLevel.has(e.hskLevel)) byLevel.set(e.hskLevel, []);
    byLevel.get(e.hskLevel)!.push(e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Đề thi thử (HSK trọn bộ)</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Mỗi đề là một bài thi hoàn chỉnh nhiều phần (Nghe · Đọc · Viết) đúng format máy thật. Tạo đề ở
        đây, sau đó vào trang soạn để thêm phần → tiểu phần → câu hỏi.
      </p>

      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" /> Tạo đề thi mới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMockExamAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Tiêu đề (VI)</Label>
              <Input name="title" placeholder="VD: Đề thi thử HSK4 — Đề 1" required />
            </div>
            <div className="space-y-1">
              <Label>Tiêu đề (ZH, tùy chọn)</Label>
              <Input name="titleZh" className="font-chinese" placeholder="HSK四级 模拟试卷一" />
            </div>
            <div className="space-y-1">
              <Label>Cấp độ HSK</Label>
              <select
                name="hskLevel"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                required
              >
                {HSK_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Tổng thời gian (phút, tùy chọn)</Label>
              <Input name="totalTime" type="number" min="0" placeholder="VD: 85" />
              <p className="text-xs text-muted-foreground">Để trống = không giới hạn theo đồng hồ.</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Mô tả (tùy chọn)</Label>
              <Textarea name="description" className="min-h-16" placeholder="Giới thiệu ngắn về đề thi..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Button type="submit">Tạo đề &amp; soạn nội dung</Button>
              <p className="text-xs text-muted-foreground">
                Sau khi tạo, bạn vào ngay trang soạn đề. Đề mới ở trạng thái Bản nháp — bấm “Đang
                hiện/Bản nháp” để xuất bản.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* List grouped by HSK level */}
      {exams.length === 0 ? (
        <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          Chưa có đề thi thử nào. Tạo đề đầu tiên ở trên.
        </p>
      ) : (
        <div className="space-y-8">
          {[...byLevel.entries()].map(([level, group]) => {
            const items: ReorderItem[] = group.map((exam) => {
              const totalParts = exam.sections.reduce((a, s) => a + s._count.parts, 0);
              return {
                id: exam.id,
                content: (
                  <Card>
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{exam.title}</span>
                          {exam.titleZh && (
                            <span className="font-chinese text-sm text-muted-foreground">
                              {exam.titleZh}
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{hskLevelLabel(exam.hskLevel)}</Badge>
                          {exam.sections.map((s, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {sectionLabel(s.skill)}
                            </Badge>
                          ))}
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Layers className="h-3 w-3" /> {totalParts} tiểu phần
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <PublishToggle model="mockExam" id={exam.id} published={exam.published} />
                        <Link href={`/admin/exam/${exam.id}`}>
                          <Button size="sm" variant="outline">
                            <ChevronRight className="h-4 w-4" /> Soạn đề
                          </Button>
                        </Link>
                        <form
                          action={async () => {
                            "use server";
                            await deleteMockExamAction(exam.id);
                          }}
                        >
                          <Button size="sm" variant="destructive" type="submit">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                ),
              };
            });
            return (
              <div key={level} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">{hskLevelLabel(level)}</h2>
                <ReorderList spec={{ kind: "mockExam", hskLevel: level }} items={items} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
