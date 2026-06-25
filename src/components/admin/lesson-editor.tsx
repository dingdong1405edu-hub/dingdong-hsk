"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveLessonAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Save, Info } from "lucide-react";

const VOCAB_TEMPLATE = `[
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

// Grammar lessons use the v3 object: an ordered list of "sections" (mỗi phần =
// lý thuyết + bài tập của chính phần đó, học xong là luyện tập ngay) rồi tới
// "test" (bài kiểm tra tổng hợp — TÁCH RIÊNG, đạt ≥ 80% mới được XP).
//
// CHUẨN: mỗi điểm ngữ pháp (section) cần ĐỦ 8 MINIGAME — 2× chọn từ (fill_blank)
// + 2× sắp xếp câu (sentence_order) + 2× dịch Việt→Trung (translate vi_to_zh)
// + 2× dịch Trung→Việt (translate zh_to_vi).
const GRAMMAR_TEMPLATE = `{
  "version": 3,
  "sections": [
    {
      "id": "shi-1",
      "title": "Câu khẳng định với 是 (shì)",
      "titleZh": "“是”字句",
      "structure": "A + 是 + B",
      "explanation": "是 (shì) nghĩa là 'là', nối chủ ngữ với danh từ để khẳng định A là B.",
      "examples": [
        {
          "situation": "Khi giới thiệu nghề nghiệp",
          "hanzi": "他是老师。",
          "pinyin": "tā shì lǎoshī",
          "meaning": "Anh ấy là giáo viên.",
          "note": "Không thêm 很 trước 是."
        }
      ],
      "exercises": [
        { "type": "fill_blank", "sentence": "我___学生。", "blank": "是", "options": ["是", "有", "在", "叫"], "hint": "Động từ 'là'" },
        { "type": "fill_blank", "sentence": "他___我的老师。", "blank": "是", "options": ["是", "很", "也", "不"] },
        { "type": "sentence_order", "words": ["学生", "是", "我"], "answer": "我是学生", "meaning": "Tôi là học sinh." },
        { "type": "sentence_order", "words": ["老师", "是", "他"], "answer": "他是老师", "meaning": "Anh ấy là giáo viên." },
        { "type": "translate", "direction": "vi_to_zh", "prompt": "Tôi là học sinh.", "answer": "我是学生", "options": ["我是学生", "我有学生", "我在学生", "我叫学生"] },
        { "type": "translate", "direction": "vi_to_zh", "prompt": "Cô ấy là bác sĩ.", "answer": "她是医生", "options": ["她是医生", "她很医生", "她也医生", "她不医生"] },
        { "type": "translate", "direction": "zh_to_vi", "prompt": "他是老师。", "pinyin": "tā shì lǎoshī", "answer": "Anh ấy là giáo viên.", "options": ["Anh ấy là giáo viên.", "Anh ấy là học sinh.", "Anh ấy là bác sĩ.", "Anh ấy rất vui."] },
        { "type": "translate", "direction": "zh_to_vi", "prompt": "我是学生。", "pinyin": "wǒ shì xuésheng", "answer": "Tôi là học sinh.", "options": ["Tôi là học sinh.", "Tôi là giáo viên.", "Tôi tên là.", "Tôi có học sinh."] }
      ]
    }
  ],
  "test": {
    "timeLimit": 180,
    "questions": [
      { "type": "fill_blank", "sentence": "他___老师。", "blank": "是", "options": ["是", "很", "也", "不"] },
      { "type": "sentence_order", "words": ["老师", "是", "他"], "answer": "他是老师" },
      { "type": "translate", "direction": "zh_to_vi", "prompt": "我是学生。", "answer": "Tôi là học sinh.", "options": ["Tôi là học sinh.", "Tôi là giáo viên.", "Tôi là bác sĩ.", "Tôi rất vui."] }
    ]
  }
}`;

interface Props {
  skill: "vocab" | "grammar";
  unitId: string;
  /** Present → edit mode; absent → create mode. */
  lesson?: { id: string; title: string; exercises: unknown };
}

export function LessonEditor({ skill, unitId, lesson }: Props) {
  const [state, action, pending] = useActionState(saveLessonAction, {
    ok: false,
  } as { ok: boolean; error?: string; warning?: string });
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!lesson;
  const isGrammar = skill === "grammar";
  const template = isGrammar ? GRAMMAR_TEMPLATE : VOCAB_TEMPLATE;

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
        <Label>{isGrammar ? "Nội dung bài học (JSON)" : "Bài tập (mảng JSON)"}</Label>
        <Textarea
          name="exercises"
          defaultValue={lesson ? JSON.stringify(lesson.exercises, null, 2) : ""}
          placeholder={template}
          className="min-h-48 font-mono text-xs"
          spellCheck={false}
          required
        />
        {isGrammar ? (
          <p className="text-[11px] text-muted-foreground">
            Object gồm <code>sections</code> (mỗi phần: <code>title</code>, <code>structure</code>,{" "}
            <code>explanation</code>, <code>examples</code>, <code>imageUrl</code> tùy chọn, và{" "}
            <code>exercises</code> — bài tập của chính phần đó) và <code>test</code> (bài kiểm tra —
            tách riêng khỏi luồng học, đạt ≥ 80% mới được điểm kinh nghiệm).{" "}
            <b>
              Mỗi điểm ngữ pháp nên có đủ 8 minigame: 2× chọn từ (fill_blank), 2× sắp xếp câu
              (sentence_order), 2× dịch Việt→Trung (translate vi_to_zh), 2× dịch Trung→Việt
              (translate zh_to_vi).
            </b>{" "}
            Để trống ô trên sẽ hiện mẫu ví dụ chuẩn.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Các loại được hỗ trợ: match, translate, toneSelect, hanziInput, sentenceOrder,
            pinyinMatch, fill_blank. Để trống ô trên sẽ hiện mẫu ví dụ.
          </p>
        )}
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
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-400/25 dark:bg-green-500/10 dark:text-green-300">
          <CheckCircle2 className="h-4 w-4" /> Đã lưu bài học.
        </div>
      )}
      {state.ok && state.warning && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.warning}</span>
        </div>
      )}

      <Button type="submit" disabled={pending}>
        <Save className="mr-1.5 h-4 w-4" />
        {pending ? "Đang lưu..." : isEdit ? "Cập nhật bài học" : "Tạo bài học"}
      </Button>
    </form>
  );
}
