// Chuyển JSON do admin DÁN (định dạng "tác giả" dễ gõ / AI sinh) → nội dung
// chuẩn của từng phần kỹ năng trong lộ trình. Tự sinh pinyin khi thiếu.
//
// Dùng được ở CẢ client (editor "dán JSON cả phần") lẫn server (nhập bài hàng
// loạt): chỉ phụ thuộc zod + pinyin-pro + roadmap-content, KHÔNG import prisma.
import { toPinyin } from "@/lib/pinyin";
import {
  authoringToRoadmapQuestions,
  normalizeReadingContent,
  normalizeListeningContent,
  type RoadmapQuestion,
} from "@/lib/roadmap-content";

function fillPinyin(text: string, pinyin?: unknown): string {
  const p = typeof pinyin === "string" ? pinyin.trim() : "";
  if (p) return p;
  const t = (text ?? "").trim();
  return t ? toPinyin(t) : "";
}

// ───────────────────────── READING ─────────────────────────

/**
 * Nhận: object đầy đủ `{ title?, titleZh?, timeLimit?, passages:[…] }`, shape cũ
 * một-đoạn `{ passage, questions }`, hoặc một MẢNG đoạn `[{ passage, questions }]`.
 * Trả về content Đọc dạng chuẩn `passages[]` (câu hỏi đã đổi `answer→correctAnswer`,
 * pinyin đoạn văn tự sinh khi thiếu).
 */
export function buildReadingContent(input: unknown, fallbackTitle = ""): unknown {
  let obj: Record<string, unknown>;
  if (Array.isArray(input)) {
    // Chấp nhận cả MẢNG "bài đọc đầy đủ" ([{ title, titleZh, passage, questions }, …])
    // — đúng định dạng JSON nhập hàng loạt ở /admin/reading. Mỗi phần tử thành 1 đoạn;
    // tiêu đề/thời gian của PHẦN lấy từ phần tử đầu (titleZh riêng mỗi đoạn vẫn giữ).
    const first = (input.find((x) => x && typeof x === "object") ?? {}) as Record<string, unknown>;
    obj = { passages: input, title: first.title, titleZh: first.titleZh, timeLimit: first.timeLimit };
  } else if (input && typeof input === "object") obj = { ...(input as Record<string, unknown>) };
  else throw new Error("Nội dung đọc phải là object hoặc mảng đoạn.");

  const norm = normalizeReadingContent(obj);
  if (norm.passages.length === 0) throw new Error("Thiếu đoạn đọc (passages).");

  const passages = norm.passages.map((p) => {
    const questions: RoadmapQuestion[] = authoringToRoadmapQuestions(p.questions);
    return {
      passage: p.passage,
      passagePinyin: p.passage ? fillPinyin(p.passage, p.passagePinyin) : null,
      ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
      ...(p.titleZh ? { titleZh: p.titleZh } : {}),
      questions,
    };
  });

  return {
    title: norm.title || fallbackTitle,
    titleZh: norm.titleZh,
    timeLimit: norm.timeLimit,
    passages,
  };
}

// ───────────────────────── LISTENING ─────────────────────────

/**
 * Nhận: object `{ title?, timeLimit?, clips:[…] }`, shape cũ một-đoạn
 * `{ audioUrl, transcript, questions }`, hoặc MẢNG đoạn nghe. Trả về content Nghe
 * dạng chuẩn `clips[]` (câu hỏi đã chuẩn hoá).
 */
export function buildListeningContent(input: unknown, fallbackTitle = ""): unknown {
  let obj: Record<string, unknown>;
  if (Array.isArray(input)) {
    // Chấp nhận cả MẢNG "bài nghe đầy đủ" ([{ title, audioUrl, transcript, questions }, …]).
    // Mỗi phần tử thành 1 đoạn nghe; tiêu đề/thời gian của PHẦN lấy từ phần tử đầu.
    const first = (input.find((x) => x && typeof x === "object") ?? {}) as Record<string, unknown>;
    obj = { clips: input, title: first.title, timeLimit: first.timeLimit };
  } else if (input && typeof input === "object") obj = { ...(input as Record<string, unknown>) };
  else throw new Error("Nội dung nghe phải là object hoặc mảng đoạn.");

  const norm = normalizeListeningContent(obj);
  if (norm.clips.length === 0) throw new Error("Thiếu đoạn nghe (clips).");

  const clips = norm.clips.map((c) => ({
    ...(c.title ? { title: c.title } : {}),
    audioUrl: c.audioUrl ?? "",
    ...(c.transcript ? { transcript: c.transcript } : {}),
    ...(c.transcriptExplanation ? { transcriptExplanation: c.transcriptExplanation } : {}),
    ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
    questions: authoringToRoadmapQuestions(c.questions),
  }));

  return {
    title: norm.title || fallbackTitle,
    timeLimit: norm.timeLimit,
    clips,
  };
}

// ───────────────────────── SPEAKING (HSKK) ─────────────────────────

/** Chuẩn hoá content Nói: tự sinh pinyin cho từng câu / đoạn khi thiếu. */
export function buildSpeakingContent(input: unknown): unknown {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const p1 = Array.isArray(o.part1Sentences)
    ? (o.part1Sentences as unknown[]).map((s) => {
        const x = (s ?? {}) as Record<string, unknown>;
        const text = String(x.text ?? "");
        return { text, pinyin: fillPinyin(text, x.pinyin) };
      })
    : [];
  const rawP2 = o.part2Passage as Record<string, unknown> | null | undefined;
  const p2Text = rawP2 && typeof rawP2 === "object" ? String(rawP2.text ?? "") : "";
  const p2 = p2Text.trim() ? { text: p2Text, pinyin: fillPinyin(p2Text, rawP2?.pinyin) } : null;
  const p3 = Array.isArray(o.part3Questions)
    ? (o.part3Questions as unknown[]).map((q) => {
        const x = (q ?? {}) as Record<string, unknown>;
        const question = String(x.question ?? "");
        return { question, pinyin: fillPinyin(question, x.pinyin) };
      })
    : [];
  return { part1Sentences: p1, part2Passage: p2, part3Questions: p3 };
}

// ───────────────────────── WRITING (写作) ─────────────────────────

/**
 * Chuẩn hoá content Viết. Nhận: object `{ taskType?, prompt, promptZh?, outline?,
 * imageUrl?, minChars?, timeLimit? }` HOẶC mảng (lấy phần tử đầu hợp lệ — khớp
 * định dạng JSON nhập hàng loạt ở /admin/writing). Điền mặc định, chuẩn hoá taskType.
 */
export function buildWritingContent(input: unknown): unknown {
  const src = Array.isArray(input)
    ? (input.find((x) => x && typeof x === "object") ?? {})
    : input && typeof input === "object"
      ? input
      : {};
  const o = src as Record<string, unknown>;
  const prompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
  if (!prompt) throw new Error("Thiếu đề bài (prompt).");
  const tt = String(o.taskType ?? "FREE").toUpperCase();
  const taskType =
    tt === "GUIDED" || tt === "PICTURE_DESCRIPTION" ? tt : "FREE";
  const str = (val: unknown) => (typeof val === "string" && val.trim() ? val.trim() : null);
  const num = (val: unknown, dflt: number) => {
    const n = typeof val === "number" ? val : Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : dflt;
  };
  return {
    taskType,
    prompt,
    promptZh: str(o.promptZh),
    outline: str(o.outline),
    imageUrl: str(o.imageUrl),
    minChars: num(o.minChars, 50),
    timeLimit: num(o.timeLimit, 900),
  };
}

// ───────────────────────── Bộ bài hàng loạt (bulk lessons) ─────────────────────────

import type { SkillKey } from "@/lib/roadmap";

export interface LessonBundleInput {
  topic: string;
  topicZh: string;
  icon?: string;
  description?: string;
  xpReward: number;
  chapter?: string; // tên chương để khớp (không tự tạo chương mới)
  sections: Partial<Record<SkillKey, unknown>>; // content thô của các kỹ năng có mặt
}

/** Đổi content thô của một kỹ năng → shape đúng để validate + lưu. */
export function buildSectionContent(skill: SkillKey, raw: unknown, fallbackTitle = ""): unknown {
  switch (skill) {
    case "READING":
      return buildReadingContent(raw, fallbackTitle);
    case "LISTENING":
      return buildListeningContent(raw, fallbackTitle);
    case "SPEAKING":
      return buildSpeakingContent(raw);
    case "WRITING":
      return buildWritingContent(raw);
    default:
      // VOCAB / GRAMMAR / HANZI: admin cung cấp đúng shape, để validate lo.
      return raw;
  }
}

const SKILL_SET: SkillKey[] = ["VOCAB", "GRAMMAR", "HANZI", "READING", "LISTENING", "WRITING", "SPEAKING"];

/**
 * Phân tích MẢNG JSON các bài để nhập hàng loạt. Mỗi phần tử có metadata bài +
 * (các) khoá kỹ năng ở cấp gốc (reading/listening/…) hoặc trong `sections`.
 * Trả về danh sách bài đã chuẩn hoá; ném lỗi nếu JSON không phải mảng.
 */
export function parseLessonsBundle(input: unknown): LessonBundleInput[] {
  if (!Array.isArray(input)) throw new Error("Cần một MẢNG JSON: [ { …bài… } ].");
  const lessons: LessonBundleInput[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const topic = typeof r.topic === "string" ? r.topic.trim() : "";
    if (!topic) continue;
    const sections: Partial<Record<SkillKey, unknown>> = {};
    const srcSections =
      r.sections && typeof r.sections === "object" ? (r.sections as Record<string, unknown>) : {};
    for (const skill of SKILL_SET) {
      const key = skill.toLowerCase();
      const val = srcSections[skill] ?? srcSections[key] ?? r[skill] ?? r[key];
      if (val !== undefined && val !== null) sections[skill] = val;
    }
    lessons.push({
      topic,
      topicZh: typeof r.topicZh === "string" ? r.topicZh : "",
      icon: typeof r.icon === "string" ? r.icon : undefined,
      description: typeof r.description === "string" ? r.description : undefined,
      xpReward: typeof r.xpReward === "number" ? r.xpReward : Number(r.xpReward) || 20,
      chapter: typeof r.chapter === "string" ? r.chapter.trim() : undefined,
      sections,
    });
  }
  if (lessons.length === 0) throw new Error("Không có bài hợp lệ (mỗi bài cần ít nhất `topic`).");
  return lessons;
}
