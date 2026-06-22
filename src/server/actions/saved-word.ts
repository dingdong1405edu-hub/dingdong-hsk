"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const saveSchema = z.object({
  hanzi: z.string().trim().min(1).max(16),
  pinyin: z.string().trim().max(64),
  meaning: z.string().trim().min(1).max(500),
  hskLevel: z.string().max(8).optional(),
  source: z.string().max(64).optional(),
});

/**
 * Lưu một từ vào "Sổ từ" của học viên. Idempotent theo (userId, hanzi): lưu lại
 * cùng một từ chỉ cập nhật nghĩa/pinyin mới nhất. Chỉ nên gọi cho từ đã có trong
 * từ điển (client kiểm tra trước khi cho lưu).
 */
export async function saveWordAction(params: z.infer<typeof saveSchema>) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Cần đăng nhập" };

  const parsed = saveSchema.safeParse(params);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ" };

  const { hanzi, pinyin, meaning, hskLevel, source } = parsed.data;
  try {
    await db.savedWord.upsert({
      where: { userId_hanzi: { userId: session.user.id, hanzi } },
      update: { pinyin, meaning, hskLevel: hskLevel ?? null, source: source ?? null },
      create: { userId: session.user.id, hanzi, pinyin, meaning, hskLevel: hskLevel ?? null, source: source ?? null },
    });
    revalidatePath("/so-tu");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}

export async function removeSavedWordAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Cần đăng nhập" };
  try {
    // deleteMany scoped to userId — không cho xoá của người khác dù biết id.
    await db.savedWord.deleteMany({ where: { id, userId: session.user.id } });
    revalidatePath("/so-tu");
    return { ok: true };
  } catch {
    return { ok: false, error: "Lỗi máy chủ" };
  }
}
