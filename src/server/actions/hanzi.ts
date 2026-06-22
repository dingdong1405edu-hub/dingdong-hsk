"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma, Skill } from "@prisma/client";

// Phần thưởng XP một lần cho từng mốc của một chữ (tránh "cày" XP):
const MASTERY_XP = 8; // lần đầu đạt thành thạo (recall đúng, hoặc đánh dấu thủ công)
const TRACE_XP = 3; // lần đầu chạm chữ qua "Viết theo mẫu"

/**
 * Ghi nhận tiến độ cho một chữ Hán và trả về số XP cần thưởng cho lượt này.
 *
 * XP chỉ cộng khi CHÍNH lượt này tạo ra bước chuyển trạng thái thật trong DB —
 * không dựa vào một lần đọc trước đó (vốn có race read-then-write). Dùng
 * `updateMany` (đếm số dòng đổi `mastered: false → true`) và `createMany` với
 * `skipDuplicates` (= `INSERT … ON CONFLICT DO NOTHING`, KHÔNG raise lỗi nên
 * không làm abort transaction trên PostgreSQL) để biết chính xác lượt này có
 * phải lượt đầu tạo dòng / lượt đầu đạt thành thạo hay không.
 */
async function settleHanziProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  characterId: string,
  master: boolean
): Promise<number> {
  if (master) {
    // Lật một dòng chưa thành thạo sang thành thạo — count là số dòng thật sự đổi.
    const flipped = await tx.hanziProgress.updateMany({
      where: { userId, characterId, mastered: false },
      data: { mastered: true, attempts: { increment: 1 } },
    });
    if (flipped.count > 0) return MASTERY_XP; // ta gây ra bước chuyển trên dòng có sẵn

    // Không có dòng "chưa thành thạo": hoặc chưa có dòng nào, hoặc đã thành thạo.
    const created = await tx.hanziProgress.createMany({
      data: [{ userId, characterId, attempts: 1, mastered: true }],
      skipDuplicates: true,
    });
    if (created.count > 0) return MASTERY_XP; // ta tạo dòng đầu (lần đầu thành thạo)

    // Đã thành thạo từ trước → chỉ đếm thêm lượt, không thưởng.
    await tx.hanziProgress.update({
      where: { userId_characterId: { userId, characterId } },
      data: { attempts: { increment: 1 } },
    });
    return 0;
  }

  // trace: thưởng đúng một lần cho lần đầu có dòng tiến độ của chữ này.
  const created = await tx.hanziProgress.createMany({
    data: [{ userId, characterId, attempts: 1, mastered: false }],
    skipDuplicates: true,
  });
  if (created.count > 0) return TRACE_XP;

  await tx.hanziProgress.update({
    where: { userId_characterId: { userId, characterId } },
    data: { attempts: { increment: 1 } },
  });
  return 0;
}

/** Đánh dấu thủ công "đã thành thạo" (nút trên trang chi tiết). */
export async function markHanziMasteredAction(characterId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const xpGain = await db.$transaction(async (tx) => {
      const gain = await settleHanziProgress(tx, userId, characterId, true);
      await tx.attempt.create({
        data: { userId, skill: Skill.HANZI, refId: characterId, rawAnswer: { mastered: true }, score: 100 },
      });
      if (gain > 0) {
        await tx.user.update({ where: { id: userId }, data: { xp: { increment: gain } } });
      }
      return gain;
    });
    return { ok: true as const, xpGain };
  } catch {
    return { ok: false as const, error: "DB error" };
  }
}

/**
 * Ghi nhận một lượt luyện viết chữ Hán đã hoàn thành (đã được xác thực nét bút).
 *  - `trace`  ("Viết theo mẫu"): viết đè lên nét mẫu. Thưởng XP một lần cho lần
 *    đầu chạm chữ; các lần sau chỉ đếm thêm số lượt (`attempts`).
 *  - `recall` ("Tập viết"): tự viết lại từ trí nhớ. Hoàn thành sẽ đánh dấu chữ là
 *    đã thành thạo (`mastered`) và thưởng XP đúng lần đầu đạt thành thạo.
 * Mỗi lượt đều ghi một `Attempt` (HANZI) để thống kê tiến độ.
 *
 * Lưu ý: chỉ gọi khi lượt viết được Hanzi Writer xác thực thật sự — luồng client
 * KHÔNG gọi action này khi chữ rơi vào chế độ viết tay tự do (không có nét mẫu).
 */
export async function recordHanziWriteAction(
  characterId: string,
  mode: "trace" | "recall"
) {
  const session = await auth();
  if (!session?.user) return { ok: false as const, error: "Unauthorized" };
  const userId = session.user.id;

  try {
    const xpGain = await db.$transaction(async (tx) => {
      const gain = await settleHanziProgress(tx, userId, characterId, mode === "recall");
      await tx.attempt.create({
        data: { userId, skill: Skill.HANZI, refId: characterId, rawAnswer: { mode, completed: true }, score: 100 },
      });
      if (gain > 0) {
        await tx.user.update({ where: { id: userId }, data: { xp: { increment: gain } } });
      }
      return gain;
    });
    return { ok: true as const, mastered: mode === "recall", xpGain };
  } catch {
    return { ok: false as const, error: "DB error" };
  }
}
