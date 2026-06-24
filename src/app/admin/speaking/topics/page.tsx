import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/admin/image-upload";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { SpeakingTopicFields, type TopicHint } from "@/components/admin/speaking-topic-fields";
import { hskLevelLabel } from "@/lib/utils";
import {
  createSpeakingTopicAction,
  updateSpeakingTopicAction,
  deleteSpeakingTopicAction,
} from "@/server/actions/admin";
import { Trash2, Plus, ArrowLeft, MessagesSquare } from "lucide-react";
import { HSKLevel } from "@prisma/client";

const HSK_LEVELS = ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"];

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
        Giám khảo đặt một câu hỏi mở theo chủ đề (kèm MP3 + transcript + gợi ý). Học viên ghi âm trả lời thành một
        đoạn dài → AI chấm chi tiết: nội dung, ngữ pháp, từ vựng, mạch lạc, lưu loát + sửa lỗi.
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
          <form
            action={async (fd) => {
              "use server";
              await createSpeakingTopicAction(fd);
            }}
            className="space-y-4"
          >
            <TopicFormBody idSuffix="-new" />
            <div className="space-y-2">
              <Button type="submit">Tạo chủ đề</Button>
              <p className="text-xs text-muted-foreground">
                Chủ đề mới ở trạng thái Bản nháp — bấm “Đang hiện/Bản nháp” để xuất bản.
              </p>
            </div>
          </form>
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
                {group.map((t) => (
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
                        <form
                          action={async (fd: FormData) => {
                            "use server";
                            await updateSpeakingTopicAction(fd);
                          }}
                          className="mt-3 space-y-4"
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <TopicFormBody
                            idSuffix={`-${t.id}`}
                            defaults={{
                              title: t.title,
                              hskLevel: t.hskLevel,
                              topic: t.topic,
                              questionZh: t.questionZh,
                              questionPinyin: t.questionPinyin,
                              questionVi: t.questionVi,
                              audioUrl: t.audioUrl,
                              transcript: t.transcript,
                              hints: asHints(t.hints),
                              sampleAnswer: t.sampleAnswer,
                              sampleAnswerPinyin: t.sampleAnswerPinyin,
                              minChars: t.minChars,
                              prepSeconds: t.prepSeconds,
                              order: t.order,
                              imageUrl: t.imageUrl,
                            }}
                          />
                          <Button type="submit" size="sm">
                            Lưu
                          </Button>
                        </form>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TopicDefaults {
  title: string;
  hskLevel: HSKLevel;
  topic: string;
  questionZh: string;
  questionPinyin: string | null;
  questionVi: string | null;
  audioUrl: string | null;
  transcript: string | null;
  hints: TopicHint[];
  sampleAnswer: string | null;
  sampleAnswerPinyin: string | null;
  minChars: number;
  prepSeconds: number;
  order: number;
  imageUrl: string | null;
}

/** Phần thân form dùng chung cho cả tạo mới và sửa (server component). */
function TopicFormBody({ idSuffix, defaults }: { idSuffix: string; defaults?: TopicDefaults }) {
  const d = defaults;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Tiêu đề (nội bộ)</Label>
          <Input name="title" defaultValue={d?.title ?? ""} placeholder="HSKK HSK3 — Sở thích" />
        </div>
        <div className="space-y-1">
          <Label>Cấp độ HSK</Label>
          <select
            name="hskLevel"
            defaultValue={d?.hskLevel ?? "HSK3"}
            className="flex h-9 w-full rounded-md border px-3 py-1 text-sm"
          >
            {HSK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>Nhãn chủ đề (hiện cho học viên)</Label>
          <Input name="topic" defaultValue={d?.topic ?? ""} placeholder="爱好 — Sở thích" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label>Thứ tự</Label>
            <Input name="order" type="number" defaultValue={d?.order ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Chuẩn bị (giây)</Label>
            <Input name="prepSeconds" type="number" defaultValue={d?.prepSeconds ?? 0} />
          </div>
          <div className="space-y-1">
            <Label>Tối thiểu (chữ)</Label>
            <Input name="minChars" type="number" defaultValue={d?.minChars ?? 0} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Câu hỏi (tiếng Trung) *</Label>
        <Textarea
          name="questionZh"
          defaultValue={d?.questionZh ?? ""}
          className="font-chinese min-h-16"
          placeholder="请谈谈你的爱好，并说明原因。"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Pinyin câu hỏi</Label>
          <Input
            name="questionPinyin"
            defaultValue={d?.questionPinyin ?? ""}
            className="font-pinyin"
            placeholder="Qǐng tántan nǐ de àihào…"
          />
        </div>
        <div className="space-y-1">
          <Label>Dịch câu hỏi (tiếng Việt)</Label>
          <Input
            name="questionVi"
            defaultValue={d?.questionVi ?? ""}
            placeholder="Hãy nói về sở thích của bạn và giải thích lý do."
          />
        </div>
      </div>

      {/* Audio + transcript + hints (client widget) */}
      <SpeakingTopicFields
        idSuffix={idSuffix}
        defaultAudioUrl={d?.audioUrl}
        defaultTranscript={d?.transcript}
        defaultHints={d?.hints}
      />

      <div className="space-y-1">
        <Label>Bài trả lời mẫu (tiếng Trung, tham khảo)</Label>
        <Textarea
          name="sampleAnswer"
          defaultValue={d?.sampleAnswer ?? ""}
          className="font-chinese min-h-20"
          placeholder="我的爱好是旅游。我觉得旅游可以让我放松，还能认识新朋友…"
        />
      </div>
      <div className="space-y-1">
        <Label>Pinyin bài mẫu (tuỳ chọn)</Label>
        <Textarea
          name="sampleAnswerPinyin"
          defaultValue={d?.sampleAnswerPinyin ?? ""}
          className="font-pinyin min-h-16"
        />
      </div>

      <div className="space-y-1">
        <Label>Ảnh đại diện (tuỳ chọn)</Label>
        <ImageUpload name="imageUrl" defaultValue={d?.imageUrl ?? undefined} />
      </div>
    </div>
  );
}
