"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveLessonAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";

const TEMPLATE = `[
  {
    "type": "translate",
    "direction": "zh_to_vi",
    "prompt": "你好",
    "pinyin": "nǐ hǎo",
    "answer": "Xin chào",
    "options": ["Xin chào", "Tạm biệt", "Cảm ơn", "Xin lỗi"]
  },
  {
    "type": "toneSelect",
    "word": "妈",
    "pinyin": "mā",
    "question": "Chọn thanh điệu đúng của 妈",
    "options": ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"],
    "correct": 0
  }
]`;

interface Props {
  skill: "vocab" | "grammar";
  unitId: string;
  /** Present → edit mode; absent → create mode. */
  lesson?: { id: string; title: string; exercises: unknown };
}

export function LessonEditor({ skill, unitId, lesson }: Props) {
  const [state, action, pending] = useActionState(saveLessonAction, {
    ok: false,
  } as { ok: boolean; error?: string });
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!lesson;

  // After a successful CREATE, clear the form so the next lesson starts fresh.
  useEffect(() => {
    if (state.ok && !isEdit) formRef.current?.reset();
  }, [state, isEdit]);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="skill" value={skill} />
      <input type="hidden" name="unitId" value={unitId} />
      {lesson && <input type="hidden" name="lessonId" value={lesson.id} />}

      <div className="space-y-1">
        <Label>Tên bài học</Label>
        <Input name="title" defaultValue={lesson?.title ?? ""} placeholder="VD: Chào hỏi cơ bản" />
      </div>

      <div className="space-y-1">
        <Label>Bài tập (mảng JSON)</Label>
        <Textarea
          name="exercises"
          defaultValue={lesson ? JSON.stringify(lesson.exercises, null, 2) : ""}
          placeholder={TEMPLATE}
          className="min-h-48 font-mono text-xs"
          spellCheck={false}
          required
        />
        <p className="text-[11px] text-muted-foreground">
          Các loại được hỗ trợ: match, translate, toneSelect, hanziInput, sentenceOrder, pinyinMatch,
          fill_blank. Để trống ô trên sẽ hiện mẫu ví dụ.
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
      {state.ok && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> Đã lưu bài học.
        </div>
      )}

      <Button type="submit" disabled={pending}>
        <Save className="mr-1.5 h-4 w-4" />
        {pending ? "Đang lưu..." : isEdit ? "Cập nhật bài học" : "Tạo bài học"}
      </Button>
    </form>
  );
}
