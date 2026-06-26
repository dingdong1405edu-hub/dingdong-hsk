"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { parseGrammarContent } from "@/lib/grammar";

const TEMPLATE = `{
  "version": 3,
  "sections": [
    {
      "id": "s1",
      "title": "Câu khẳng định với 是",
      "titleZh": "是字句",
      "structure": "A + 是 + B",
      "breakdown": [
        { "part": "A", "role": "Chủ ngữ", "meaning": "Người hoặc vật được nói đến (我, 他, 这…)." },
        { "part": "是", "pinyin": "shì", "role": "Động từ 'là'", "meaning": "Nối A với B, khẳng định A chính là B." },
        { "part": "B", "role": "Danh từ", "meaning": "Cái mà A chính là (老师, 学生…)." }
      ],
      "explanation": "是 (shì) nghĩa là 'là', nối chủ ngữ với danh từ để khẳng định A là B.",
      "usage": "Dùng khi giới thiệu hoặc khẳng định danh tính, nghề nghiệp, quan hệ ('A là B').",
      "mistakes": [
        { "wrong": "我是高兴。", "right": "我很高兴。", "note": "是 không đi với tính từ — dùng 很 trước tính từ." }
      ],
      "examples": [
        { "situation": "Giới thiệu nghề", "hanzi": "他是老师。", "pinyin": "tā shì lǎoshī", "meaning": "Anh ấy là giáo viên." }
      ],
      "exercises": [
        { "type": "fill_blank", "sentence": "我___学生。", "blank": "是", "options": ["是", "有", "在", "叫"] },
        { "type": "sentence_order", "words": ["学生", "是", "我"], "answer": "我是学生", "meaning": "Tôi là học sinh." },
        { "type": "translate", "direction": "vi_to_zh", "prompt": "Tôi là học sinh.", "answer": "我是学生", "options": ["我是学生", "我有学生", "我在学生", "我叫学生"] }
      ]
    }
  ],
  "test": { "timeLimit": 180, "passThreshold": 60, "questions": [] }
}`;

export function GrammarSectionEditor({
  value,
  onChange,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const [text, setText] = useState(() => {
    const v = value as { sections?: unknown[] } | null;
    const hasContent = v && Array.isArray(v.sections) && v.sections.length > 0;
    if (hasContent) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return TEMPLATE;
      }
    }
    return TEMPLATE;
  });
  const [err, setErr] = useState<string | null>(null);
  const [stat, setStat] = useState<string | null>(null);

  function handle(next: string) {
    setText(next);
    try {
      const obj = JSON.parse(next);
      const parsed = parseGrammarContent(obj);
      setErr(null);
      setStat(`${parsed.sections.length} phần lý thuyết · ${parsed.test.questions.length} câu kiểm tra`);
      onChange(obj);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "JSON không hợp lệ");
      setStat(null);
    }
  }

  // Đồng bộ nội dung mẫu/đang có lên panel ngay khi mở (để bấm Lưu là khớp).
  useEffect(() => {
    handle(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Soạn theo JSON v3 (gồm các phần lý thuyết + bài tập + bài kiểm tra). Để trống mảng test.questions nếu
          không cần bài kiểm tra.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={() => handle(TEMPLATE)}>
          Chèn mẫu
        </Button>
      </div>
      <Textarea
        value={text}
        onChange={(e) => handle(e.target.value)}
        spellCheck={false}
        className="min-h-72 font-mono text-xs"
      />
      {err ? (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> {err}
        </p>
      ) : stat ? (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> {stat}
        </p>
      ) : null}

      <details className="rounded-xl border bg-muted/20 p-3 text-xs">
        <summary className="cursor-pointer font-medium">Hướng dẫn cấu trúc &amp; loại bài tập</summary>
        <div className="mt-2 space-y-1.5 text-muted-foreground">
          <p>
            Mỗi <code>section</code> gồm: <b>title</b>, <b>structure</b> (công thức), <b>breakdown</b> (giải
            nghĩa <i>từng phần</i> của công thức — phần quan trọng nhất cho người mới), <b>explanation</b>,{" "}
            <b>usage</b> (khi nào dùng), <b>mistakes</b> (lỗi thường gặp), <b>examples</b> (tình huống) và{" "}
            <b>exercises</b> (minigame luyện tập). <code>test.questions</code> là bài kiểm tra (để trống nếu không cần).
          </p>
          <p className="rounded-lg border border-violet-200 bg-violet-50/60 p-2 dark:border-violet-400/25 dark:bg-violet-500/10">
            <b>breakdown</b> là mảng theo đúng thứ tự công thức, mỗi phần:{" "}
            <code>{`{ "part": "是", "pinyin": "shì", "role": "Động từ 'là'", "meaning": "Nối A với B" }`}</code>.
            Mỗi phần sẽ thành một thẻ màu riêng, khớp màu với ô trong công thức.{" "}
            <b>mistakes</b>: <code>{`{ "wrong": "我是高兴", "right": "我很高兴", "note": "..." }`}</code>.
          </p>
          <p>Các loại bài tập (mỗi câu tự chứa đáp án đúng):</p>
          <ul className="ml-4 list-disc space-y-0.5">
            <li><code>fill_blank</code>: {`{ sentence: "我___学生", blank: "是", options: [...] }`}</li>
            <li><code>sentence_order</code>: {`{ words: [...], answer: "我是学生" }`}</li>
            <li><code>translate</code>: {`{ direction: "vi_to_zh"|"zh_to_vi", prompt, answer, options: [...] }`}</li>
            <li><code>toneSelect</code>: {`{ word, pinyin, question, options: [...], correct: 0 }`}</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
