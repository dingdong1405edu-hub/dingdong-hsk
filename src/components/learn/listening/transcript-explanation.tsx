"use client";
import { BookOpenText } from "lucide-react";

/**
 * Hiển thị bản dịch & giải thích lời thoại (tiếng Việt) ở phần chữa bài. Nội dung
 * là text gọn do admin lưu (Groq sinh): tóm tắt + "— Dịch lời thoại —" + "— Từ
 * vựng —" với các dòng "• …". Ta tô đậm nhẹ các tiêu đề mục cho dễ đọc.
 */
export function TranscriptExplanation({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/70 to-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-violet-100 bg-violet-50/70 px-4 py-2.5 text-sm font-bold text-violet-700">
        <BookOpenText className="h-4 w-4" /> Dịch &amp; giải thích lời thoại
      </div>
      <div className="space-y-1.5 p-4 text-sm leading-relaxed text-zinc-700">
        {lines.map((raw, i) => {
          const line = raw.trim();
          if (!line) return <div key={i} className="h-1" aria-hidden />;
          const header = line.match(/^—\s*(.+?)\s*—$/);
          if (header) {
            return (
              <div key={i} className="pt-1.5 text-xs font-bold uppercase tracking-wide text-violet-600">
                {header[1]}
              </div>
            );
          }
          if (line.startsWith("•")) {
            return (
              <div key={i} className="flex gap-1.5 pl-1 font-chinese">
                <span className="text-violet-400">•</span>
                <span>{line.replace(/^•\s*/, "")}</span>
              </div>
            );
          }
          return <p key={i}>{line}</p>;
        })}
      </div>
    </div>
  );
}
