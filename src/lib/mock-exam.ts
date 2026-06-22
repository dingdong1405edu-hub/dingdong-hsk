import type { Skill } from "@prisma/client";

// Nhãn cho từng phần của đề thi thử (đúng tên trong đề HSK thật).
export const EXAM_SECTION_META: Record<string, { label: string; zh: string }> = {
  LISTENING: { label: "Nghe hiểu", zh: "听力" },
  READING: { label: "Đọc hiểu", zh: "阅读" },
  WRITING: { label: "Viết", zh: "书写" },
};

/** Các kỹ năng được phép trong đề thi thử (chỉ Nghe/Đọc/Viết như đề thật). */
export const EXAM_SKILLS: Skill[] = ["LISTENING", "READING", "WRITING"];

/** Tên phần hiển thị: ưu tiên tiêu đề admin nhập, nếu trống suy từ kỹ năng. */
export function sectionLabel(skill: Skill, title?: string | null): string {
  if (title && title.trim()) return title.trim();
  const m = EXAM_SECTION_META[skill];
  return m ? `${m.zh} · ${m.label}` : String(skill);
}

/** Cấu thành đề (vd "Nghe · Đọc · Viết") để hiện trên thẻ đề. */
export function examComposition(skills: Skill[]): string {
  const order: Skill[] = ["LISTENING", "READING", "WRITING"];
  const present = order.filter((s) => skills.includes(s));
  return present.map((s) => EXAM_SECTION_META[s]?.label ?? s).join(" · ");
}
