import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/**
 * Nhật ký thao tác quản trị (audit log).
 *
 * Mục tiêu: ghi lại "ai sửa/xóa cái gì, lúc nào" để quản lý nhân sự và phòng
 * trường hợp một admin xóa nội dung. Mỗi thao tác create/update/delete trong
 * khu vực admin gọi `logAudit(...)` ngay sau khi mutation thành công.
 *
 * NGUYÊN TẮC: việc ghi log KHÔNG BAO GIỜ được làm hỏng thao tác chính — mọi lỗi
 * đều được nuốt (chỉ console.error), nên gọi `logAudit` SAU khi mutation đã
 * thành công và KHÔNG đặt trong cùng transaction với mutation đó.
 */

/** Số ngày giữ nhật ký trước khi tự dọn. Người dùng chọn: "thời gian ngắn". */
export const AUDIT_RETENTION_DAYS = 30;

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

/** Người thực hiện — lấy từ `requireAdminActor()` (src/lib/admin-guard.ts). */
export type AuditActor = { id: string; email: string; name?: string | null };

export type AuditInput = {
  actor: AuditActor;
  action: AuditAction;
  /** Tên model bị tác động, VD "ReadingTest", "User", "Subscription". */
  entity: string;
  /** id bản ghi bị tác động (nếu có). */
  entityId?: string | null;
  /** Mô tả tiếng Việt ngắn gọn, VD: `Xóa bài đọc «Chào hỏi»`. */
  summary: string;
  /** Nội dung TRƯỚC khi sửa/xóa (bỏ qua với CREATE). */
  before?: unknown;
  /** Nội dung SAU khi tạo/sửa (bỏ qua với DELETE). */
  after?: unknown;
};

/**
 * Chuẩn hóa giá trị bất kỳ về JSON an toàn cho Prisma (Json column).
 * - Date → chuỗi ISO (qua JSON.stringify mặc định).
 * - BigInt → chuỗi (Prisma/JSON không chứa được BigInt — VD Payment.orderCode).
 * - undefined/null → undefined (cột để trống).
 */
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, val) =>
        typeof val === "bigint" ? val.toString() : val,
      ),
    ) as Prisma.InputJsonValue;
  } catch {
    return undefined;
  }
}

/** Ghi một dòng nhật ký. Không bao giờ ném lỗi ra ngoài. */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        actorName: input.actor.name ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        summary: input.summary,
        before: toJson(input.before),
        after: toJson(input.after),
      },
    });
  } catch (err) {
    // Audit không được phá thao tác chính — chỉ log lỗi ra server.
    console.error("[audit] không ghi được nhật ký:", err);
  }
}

/**
 * Dọn các bản ghi cũ hơn AUDIT_RETENTION_DAYS. Gọi khi mở trang /admin/history
 * (force-dynamic) nên không cần cron riêng. Trả về số dòng đã xóa.
 */
export async function pruneOldAuditLogs(): Promise<number> {
  const cutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  try {
    const { count } = await db.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return count;
  } catch (err) {
    console.error("[audit] không dọn được nhật ký cũ:", err);
    return 0;
  }
}

/** Nhãn tiếng Việt cho từng loại đối tượng (dùng cho summary + UI). */
export const ENTITY_LABELS: Record<string, string> = {
  ReadingTest: "bài đọc",
  ListeningTest: "bài nghe",
  WritingTask: "bài viết",
  SpeakingSet: "bộ luyện nói",
  SpeakingTopic: "chủ đề nói",
  Question: "câu hỏi",
  VocabUnit: "đơn vị từ vựng",
  VocabLesson: "bài từ vựng",
  VocabWord: "từ vựng",
  GrammarUnit: "đơn vị ngữ pháp",
  GrammarLesson: "bài ngữ pháp",
  HanziCharacter: "chữ Hán",
  MockExam: "đề thi thử",
  MockExamSection: "phần thi",
  MockExamPart: "tiểu phần thi",
  Material: "tài liệu",
  Course: "khóa lộ trình",
  RoadmapChapter: "chương lộ trình",
  RoadmapLesson: "bài lộ trình",
  RoadmapSection: "kỹ năng lộ trình",
  User: "người dùng",
  Subscription: "gói quyền lợi",
  WordReport: "phản ánh từ",
  Feedback: "góp ý",
};

export function entityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}
