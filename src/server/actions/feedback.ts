"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-guard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FeedbackCategory, FeedbackStatus } from "@prisma/client";

// ── Học viên: gửi liên hệ / góp ý ─────────────────────────────────────────────

const submitSchema = z.object({
  category: z.nativeEnum(FeedbackCategory),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(5, "Nội dung quá ngắn (tối thiểu 5 ký tự)").max(4000, "Nội dung quá dài"),
  // Email liên hệ tuỳ chọn (mặc định lấy email tài khoản). Cho phép bỏ trống.
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .email("Email không hợp lệ")
    .optional()
    .or(z.literal("")),
});

export type SubmitFeedbackInput = z.infer<typeof submitSchema>;

/**
 * Học viên gửi liên hệ/góp ý từ trang /lien-he (trong khu vực học → luôn đã đăng
 * nhập). Lưu kèm SNAPSHOT tên + email tài khoản để admin liên hệ lại. Mọi mục
 * vào hộp thư admin ở /admin/feedback với trạng thái NEW.
 */
export async function submitFeedbackAction(input: SubmitFeedbackInput) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Cần đăng nhập để gửi góp ý" };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  }

  const { category, subject, message, contactEmail } = parsed.data;
  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const email = contactEmail && contactEmail.length > 0 ? contactEmail : user?.email ?? null;

    await db.feedback.create({
      data: {
        userId: session.user.id,
        category,
        subject: subject?.trim() ? subject.trim() : null,
        message,
        contactName: user?.name ?? null,
        contactEmail: email,
        status: "NEW",
      },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ, bạn thử lại sau nhé" };
  }
}

// ── Admin: cập nhật trạng thái / xoá ──────────────────────────────────────────

const moderateSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(FeedbackStatus),
  adminNote: z.string().max(2000).optional(),
});

export async function updateFeedbackStatusAction(input: z.infer<typeof moderateSchema>) {
  await requireAdmin();
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };
  const { id, status, adminNote } = parsed.data;
  try {
    await db.feedback.update({
      where: { id },
      // adminNote === undefined → giữ nguyên ghi chú cũ (chỉ đổi trạng thái).
      data: { status, adminNote: adminNote === undefined ? undefined : adminNote || null },
    });
    revalidatePath("/admin/feedback");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}

export async function deleteFeedbackAction(id: string) {
  await requireAdmin();
  try {
    await db.feedback.delete({ where: { id } });
    revalidatePath("/admin/feedback");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}
