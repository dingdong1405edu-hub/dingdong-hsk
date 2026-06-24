import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublishToggle } from "@/components/admin/publish-toggle";
import {
  SpeakingTopicForm,
  type TopicHint,
  type TopicFormDefaults,
} from "@/components/admin/speaking-topic-fields";
import { hskLevelLabel } from "@/lib/utils";
import {
  createSpeakingTopicAction,
  updateSpeakingTopicAction,
  deleteSpeakingTopicAction,
} from "@/server/actions/admin";
import { Trash2, Plus, ArrowLeft, MessagesSquare } from "lucide-react";
import { HSKLevel } from "@prisma/client";

// Bọc về Promise<void> để dùng làm `action` của <form> trong client component.
async function createAction(fd: FormData) {
  "use server";
  await createSpeakingTopicAction(fd);
}
async function updateAction(fd: FormData) {
  "use server";
  await updateSpeakingTopicAction(fd);
}

function asHints(v: unknown): TopicHint[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
    .map((h) => ({
      text: typeof h.text === "string" ? h.text : "",
      pinyin: typeof h.pinyin === "string" ? h.pinyin : "",
      vi: typeof h.vi === "string" ? h.vi : "",
    }));
}

export default async function AdminSpeakingTopicsPage() {
  const topics = await db.speakingTopic.findMany({
    orderBy: [{ hskLevel: "asc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  const byLevel = new Map<HSKLevel, typeof topics>();
  for (const t of topics) {
    if (!byLevel.has(t.hskLevel)) byLevel.set(t.hskLevel, []);
    byLevel.get(t.hskLevel)!.push(t);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessagesSquare className="h-6 w-6 text-indigo-600" /> Nói theo chủ đề (HSKK)
        </h1>
        <Link href="/admin/speaking">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" /> Bộ luyện nói
          </Button>
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Giám khảo đặt câu hỏi mở theo chủ đề (kèm MP3 + transcript + gợi ý + dàn ý). Học viên ghi âm trả lời thành một
        đoạn dài → AI chấm chi tiết: nội dung, ngữ pháp, từ vựng, mạch lạc, lưu loát + sửa lỗi. Mẹo: bấm{" "}
        <b>“Điền nhanh bằng JSON”</b> để dán một lần cho mọi ô chữ, rồi chỉ cần tải MP3.
      </p>

      {/* Create */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Plus className="mr-2 inline h-4 w-4" />
            Thêm chủ đề
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SpeakingTopicForm action={createAction} submitLabel="Tạo chủ đề" idSuffix="-new" />
          <p className="mt-2 text-xs text-muted-foreground">
            Chủ đề mới ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.
          </p>
        </CardContent>
      </Card>

      {/* List */}
      {topics.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-12 text-center text-muted-foreground">
          Chưa có chủ đề nói nào. Thêm chủ đề đầu tiên ở trên.
        </div>
      ) : (
        <div className="space-y-6">
          {[...byLevel.entries()].map(([level, group]) => (
            <div key={level} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{hskLevelLabel(level)}</h2>
              <div className="space-y-3">
                {group.map((t) => {
                  const defaults: TopicFormDefaults = {
                    title: t.title,
                    hskLevel: t.hskLevel,
                    topic: t.topic,
                    questionZh: t.questionZh,
                    questionPinyin: t.questionPinyin,
                    questionVi: t.questionVi,
                    outline: t.outline,
                    audioUrl: t.audioUrl,
                    transcript: t.transcript,
                    hints: asHints(t.hints),
                    sampleAnswer: t.sampleAnswer,
                    sampleAnswerPinyin: t.sampleAnswerPinyin,
                    minChars: t.minChars,
                    prepSeconds: t.prepSeconds,
                    order: t.order,
                    imageUrl: t.imageUrl,
                  };
                  return (
                    <Card key={t.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{t.title || t.topic || "(chưa đặt tên)"}</span>
                              <Badge variant="outline">{hskLevelLabel(t.hskLevel)}</Badge>
                              {t.audioUrl && <Badge variant="secondary">Có MP3</Badge>}
                            </div>
                            <div className="font-chinese mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {t.questionZh}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <PublishToggle model="speakingTopic" id={t.id} published={t.published} />
                            <form
                              action={async () => {
                                "use server";
                                await deleteSpeakingTopicAction(t.id);
                              }}
                            >
                              <Button size="sm" variant="destructive" type="submit">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </form>
                          </div>
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">Sửa</summary>
                          <div className="mt-3">
                            <SpeakingTopicForm
                              action={updateAction}
                              id={t.id}
                              defaults={defaults}
                              submitLabel="Lưu"
                              idSuffix={`-${t.id}`}
                            />
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
