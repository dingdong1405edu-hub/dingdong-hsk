"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Skill } from "@prisma/client";

export async function markHanziMasteredAction(characterId: string) {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  try {
    await db.$transaction([
      db.hanziProgress.upsert({
        where: { userId_characterId: { userId: session.user.id, characterId } },
        update: { mastered: true, attempts: { increment: 1 } },
        create: { userId: session.user.id, characterId, mastered: true, attempts: 1 },
      }),
      db.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: 5 } },
      }),
      db.attempt.create({
        data: {
          userId: session.user.id,
          skill: Skill.HANZI,
          refId: characterId,
          rawAnswer: { mastered: true },
          score: 100,
        },
      }),
    ]);
    return { ok: true };
  } catch {
    return { ok: false, error: "DB error" };
  }
}
