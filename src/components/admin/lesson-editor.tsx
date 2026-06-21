"use client";
import { useActionState, useEffect, useRef } from "react";
import { saveLessonAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";

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
// "test" (bài kiểm tra tổng hợp cuối bài, đạt ≥ passThreshold% mới qua).
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
        {
          "type": "fill_blank",
          "sentence": "我___学生。",
          "blank": "是",
          "options": ["是", "有", "在", "叫"],
          "hint": "Động từ 'là'"
        },
        {
          "type": "answer_question",
          "question": "你是学生吗？",
          "questionPinyin": "nǐ shì xuésheng ma?",
          "accept": ["我是学生", "是", "我是"],
          "sampleAnswer": "我是学生。"
        }
      ]
    },
    {
      "id": "shi-2",
      "title": "Lưu ý: 是 đi với danh từ",
      "structure": "A + 是 + danh từ (KHÔNG dùng với tính từ)",
      "explanation": "是 chỉ nối với danh từ. 'rất vui' dùng 很 chứ không dùng 是.",
      "examples": [],
      "exercises": [
        {
          "type": "type_sentence",
          "prompt": "Dịch sang tiếng Trung: Cô ấy là bác sĩ.",
          "accept": ["她是医生"],
          "meaning": "Cô ấy là bác sĩ."
        }
      ]
    }
  ],
  "test": {
    "timeLimit": 180,
    "passThreshold": 60,
    "questions": [
      {
        "type": "fill_blank",
        "sentence": "他___老师。",
        "blank": "是",
        "options": ["是", "很", "也", "不"]
      },
      {
        "type": "sentence_order",
        "words": ["老师", "是", "他"],
        "answer": "他是老师"
      }
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
  } as { ok: boolean; error?: string });
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
            <code>exercises</code> — bài tập của chính phần đó) và <code>test</code> (bài kiểm tra
            tổng hợp, đạt ≥ <code>passThreshold</code>% để qua bài). Loại bài tập: fill_blank,
            sentence_order, translate, answer_question, type_sentence, toneSelect, match,
            pinyinMatch. Xem hướng dẫn chi tiết bên dưới. Để trống ô trên sẽ hiện mẫu ví dụ.
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
