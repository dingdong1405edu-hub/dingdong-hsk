"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminActor } from "@/lib/admin-guard";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { WordReportKind, WordReportStatus } from "@prisma/client";

// ── Học viên: gửi phản ánh / bình luận về một từ ──────────────────────────────

const submitSchema = z.object({
  wordId: z.string().min(1),
  kind: z.nativeEnum(WordReportKind),
  content: z.string().trim().min(2, "Nội dung quá ngắn").max(1000),
});

/**
 * Học viên gửi báo lỗi (ERROR) hoặc bình luận (COMMENT) cho một từ. Luôn ở trạng
 * thái PENDING — admin nhận ở /admin/word-reports; chỉ COMMENT đã APPROVED mới
 * hiển thị công khai cho học viên khác.
 */
export async function submitWordReportAction(params: z.infer<typeof submitSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Cần đăng nhập" };

  const parsed = submitSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const { wordId, kind, content } = parsed.data;
  try {
    const word = await db.vocabWord.findUnique({ where: { id: wordId }, select: { id: true } });
    if (!word) return { ok: false, error: "Không tìm thấy từ" };

    await db.wordReport.create({
      data: { userId: session.user.id, wordId, kind, content, status: "PENDING" },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}

export interface PublicComment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

/** Lấy các bình luận ĐÃ DUYỆT của một từ để hiển thị công khai. */
export async function getWordCommentsAction(wordId: string): Promise<PublicComment[]> {
  if (!wordId) return [];
  try {
    const rows = await db.wordReport.findMany({
      where: { wordId, status: "APPROVED", kind: "COMMENT" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, content: true, createdAt: true, user: { select: { name: true, email: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      content: r.content,
      authorName: r.user.name ?? r.user.email?.split("@")[0] ?? "Học viên",
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

// ── Admin: duyệt / từ chối / xoá ──────────────────────────────────────────────

const moderateSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(WordReportStatus),
  adminNote: z.string().max(1000).optional(),
});

export async function moderateWordReportAction(params: z.infer<typeof moderateSchema>) {
  const { actor } = await requireAdminActor();
  const parsed = moderateSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };
  const { id, status, adminNote } = parsed.data;
  try {
    const before = await db.wordReport.findUnique({ where: { id } });
    const after = await db.wordReport.update({ where: { id }, data: { status, adminNote: adminNote || null } });
    await logAudit({
      actor,
      action: "UPDATE",
      entity: "WordReport",
      entityId: after.id,
      summary: `Sửa phản ánh từ vựng «${after.id}»`,
      before,
      after,
    });
    revalidatePath("/admin/word-reports");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}

export async function deleteWordReportAction(id: string) {
  const { actor } = await requireAdminActor();
  try {
    const before = await db.wordReport.delete({ where: { id } });
    await logAudit({
      actor,
      action: "DELETE",
      entity: "WordReport",
      entityId: before.id,
      summary: `Xóa phản ánh từ vựng «${before.id}»`,
      before,
    });
    revalidatePath("/admin/word-reports");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}
