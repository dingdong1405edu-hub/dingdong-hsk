import { Card, CardContent } from "@/components/ui/card";

/**
 * Beginner-friendly, in-page guide for authoring a grammar lesson's JSON.
 * Rendered on the admin grammar unit page so a new admin can read it and add a
 * lesson by hand. Pure presentational (server component, native <details>).
 */
function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <li className="text-[13px]">
      <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">{name}</code>{" "}
      <span className="text-muted-foreground">— {children}</span>
    </li>
  );
}

export function GrammarAuthorGuide() {
  return (
    <Card className="border-violet-200 bg-violet-50/40 dark:border-violet-400/25 dark:bg-violet-500/10">
      <CardContent className="p-4">
        <details>
          <summary className="cursor-pointer select-none text-sm font-bold text-violet-800 dark:text-violet-300">
            📘 Hướng dẫn thêm bài ngữ pháp (JSON) — bấm để mở
          </summary>

          <div className="mt-4 space-y-5 text-sm">
            {/* Overview */}
            <section className="space-y-2">
              <h3 className="font-semibold">1. Cấu trúc tổng thể</h3>
              <p className="text-muted-foreground">
                Mỗi bài học là một object gồm <b>sections</b> (các phần) và <b>test</b> (bài kiểm
                tra). Mỗi phần có <b>lý thuyết riêng</b> và <b>bài tập riêng</b> — học viên học xong
                lý thuyết phần nào sẽ luyện tập ngay phần đó, rồi sang phần tiếp theo.{" "}
                <b>Hoàn thành phần luyện tập là mở khoá bài kế tiếp</b> (KHÔNG bắt buộc làm bài kiểm
                tra). Bài <b>test</b> được <b>tách riêng</b> (nút “Kiểm tra”); chấm xong sẽ hiện đáp
                án và chỉ rõ câu sai, và chỉ khi đạt <b>≥ 80%</b> mới được điểm kinh nghiệm.
              </p>
              <div className="rounded-lg border border-violet-300 bg-violet-100/60 p-3 text-[13px] text-violet-900 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-200">
                <b>Bắt buộc về số lượng minigame:</b> mỗi điểm ngữ pháp (mỗi <b>section</b>) cần có
                đủ <b>8 minigame</b> — 2× <b>chọn từ</b> (<code>fill_blank</code>), 2× <b>sắp xếp
                câu</b> (<code>sentence_order</code>), 2× <b>dịch Việt→Trung</b> (
                <code>translate</code>, <code>direction: "vi_to_zh"</code>), 2× <b>dịch Trung→Việt</b>{" "}
                (<code>translate</code>, <code>direction: "zh_to_vi"</code>). Lưu thiếu vẫn được nhưng
                hệ thống sẽ nhắc.
              </div>
              <Code>{`{
  "version": 3,
  "sections": [ { ...phần 1 (đủ 8 minigame)... }, { ...phần 2... } ],
  "test": { "timeLimit": 180, "questions": [ ... ] }
}`}</Code>
            </section>

            {/* Section fields */}
            <section className="space-y-2">
              <h3 className="font-semibold">2. Một phần (section) gồm gì?</h3>
              <ul className="space-y-1">
                <Field name="id">mã ngắn, duy nhất trong bài (vd: "shi-1").</Field>
                <Field name="title">tiêu đề tiếng Việt của phần.</Field>
                <Field name="titleZh">tiêu đề chữ Hán (tùy chọn).</Field>
                <Field name="structure">công thức ngữ pháp — sẽ được đóng khung nổi bật (vd: "A + 是 + B").</Field>
                <Field name="explanation">giải thích bằng tiếng Việt (bắt buộc).</Field>
                <Field name="imageUrl">link ảnh minh hoạ (tùy chọn) — dán URL ảnh đã có trên mạng (vd: https://abc.com/anh.png). Bỏ field này nếu không có ảnh. Mỗi ví dụ cũng có thể có imageUrl riêng.</Field>
                <Field name="examples">mảng ví dụ theo ngữ cảnh (có thể để [] nếu chưa có).</Field>
                <Field name="exercises">
                  mảng bài tập của riêng phần này (học xong là làm luôn). <b>Nên đủ 8 minigame</b>:
                  2× fill_blank, 2× sentence_order, 2× translate vi_to_zh, 2× translate zh_to_vi.
                </Field>
              </ul>
              <p className="text-muted-foreground">Mỗi ví dụ trong examples:</p>
              <Code>{`{
  "situation": "Khi giới thiệu nghề nghiệp",
  "hanzi": "他是老师。",
  "pinyin": "tā shì lǎoshī",
  "meaning": "Anh ấy là giáo viên.",
  "note": "Không thêm 很 trước 是."
}`}</Code>
            </section>

            {/* Exercise catalog */}
            <section className="space-y-3">
              <h3 className="font-semibold">3. Các loại bài tập (dùng cho exercises & test.questions)</h3>

              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-[13px] dark:border-amber-400/25 dark:bg-amber-500/10">
                <b>Mẹo:</b> Mọi loại bài tập đều có thể thêm trường tùy chọn{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px]">explanation</code>{" "}
                — lời giải thích bằng tiếng Việt <b>tại sao đáp án đúng</b>. Khi học viên trả lời
                SAI, hệ thống sẽ hiện đáp án đúng kèm phần giải thích này (không chỉ hiện mỗi đáp án).
                Nên viết ngắn gọn, tập trung vào lỗi thường gặp.
              </div>

              <div>
                <p className="font-medium">a) Điền từ — trắc nghiệm (fill_blank)</p>
                <Code>{`{
  "type": "fill_blank",
  "sentence": "我___学生。",       // ___ là chỗ trống
  "blank": "是",                  // đáp án đúng
  "options": ["是", "有", "在", "叫"],
  "hint": "Động từ 'là'",         // tùy chọn
  "explanation": "Dùng 是 để nối chủ ngữ với danh từ (学生). 有 = 'có', 在 = 'ở', đều sai ngữ cảnh."  // tùy chọn, hiện khi trả lời sai
}`}</Code>
              </div>

              <div>
                <p className="font-medium">b) Sắp xếp thành câu (sentence_order)</p>
                <Code>{`{
  "type": "sentence_order",
  "words": ["老师", "是", "他"],
  "answer": "他是老师",            // chuỗi đúng, nối liền KHÔNG dấu cách
  "meaning": "Anh ấy là giáo viên." // tùy chọn
}`}</Code>
              </div>

              <div>
                <p className="font-medium">c) Trả lời câu hỏi — gõ tự do (answer_question)</p>
                <Code>{`{
  "type": "answer_question",
  "question": "你是学生吗？",
  "questionPinyin": "nǐ shì xuésheng ma?",   // tùy chọn
  "accept": ["我是学生", "是", "我是"],        // các đáp án được chấp nhận
  "sampleAnswer": "我是学生。",                // hiện ra khi chấm
  "hint": "Trả lời khẳng định"                // tùy chọn
}`}</Code>
                <p className="text-[12px] text-muted-foreground">
                  Chấm bằng cách so khớp với danh sách <b>accept</b> (tự bỏ dấu câu, dấu cách, không
                  phân biệt hoa/thường). Hãy liệt kê vài cách trả lời đúng phổ biến.
                </p>
              </div>

              <div>
                <p className="font-medium">d) Tự gõ câu hoàn chỉnh (type_sentence)</p>
                <Code>{`{
  "type": "type_sentence",
  "prompt": "Dịch sang tiếng Trung: Cô ấy là bác sĩ.",
  "accept": ["她是医生"],     // các câu đúng được chấp nhận
  "meaning": "Cô ấy là bác sĩ." // tùy chọn
}`}</Code>
              </div>

              <div>
                <p className="font-medium">e) Dịch — trắc nghiệm (translate)</p>
                <Code>{`{
  "type": "translate",
  "direction": "vi_to_zh",     // hoặc "zh_to_vi"
  "prompt": "Cô ấy là bác sĩ.",
  "answer": "她是医生。",        // đáp án đúng, PHẢI nằm trong options
  "options": ["她是医生。", "他是老师。", "我是学生。", "你是医生。"]
}`}</Code>
              </div>

              <div>
                <p className="font-medium">f) Chọn thanh điệu (toneSelect)</p>
                <Code>{`{
  "type": "toneSelect",
  "word": "妈", "pinyin": "mā",
  "question": "Chọn thanh điệu đúng của 妈",
  "options": ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4"],
  "correct": 0                 // vị trí đáp án đúng (bắt đầu từ 0)
}`}</Code>
              </div>

              <p className="text-[12px] text-muted-foreground">
                Còn có <code>match</code> (ghép Hán–Việt) và <code>pinyinMatch</code> (ghép Hán–pinyin)
                nhưng hai loại này luôn đúng khi hoàn thành, nên chỉ nên dùng để luyện tập, KHÔNG nên
                đưa vào bài test.
              </p>
            </section>

            {/* Test + tips */}
            <section className="space-y-2">
              <h3 className="font-semibold">4. Bài kiểm tra & mẹo</h3>
              <ul className="space-y-1">
                <Field name="test.questions">mảng câu hỏi (dùng đúng các loại ở mục 3).</Field>
                <Field name="test.timeLimit">thời gian làm bài tính bằng giây (tùy chọn; bỏ qua nếu không giới hạn).</Field>
              </ul>
              <ul className="list-disc space-y-1 pl-5 text-[13px] text-muted-foreground">
                <li>
                  <b>Bài kiểm tra tách riêng</b> khỏi phần học (nút “Kiểm tra” ở danh sách bài). Chấm
                  xong hiện đáp án + chỉ rõ câu sai cho từng câu.
                </li>
                <li>
                  Đạt <b>≥ 80%</b> mới được điểm kinh nghiệm (mỗi bài chỉ thưởng một lần). Làm bài
                  kiểm tra <b>không bắt buộc</b> để sang bài tiếp theo.
                </li>
                <li>Học viên KHÔNG bị trừ tim ở phần ngữ pháp; mỗi bài luyện tập có nút Bỏ qua.</li>
                <li>Sau khi dán JSON, bấm lưu — nếu sai cấu trúc hệ thống sẽ báo lỗi cụ thể ngay.</li>
              </ul>
            </section>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
