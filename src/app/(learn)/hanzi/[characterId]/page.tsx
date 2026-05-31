import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { HanziDetailClient } from "./hanzi-detail-client";

interface Props {
  params: Promise<{ characterId: string }>;
}

export default async function HanziDetailPage({ params }: Props) {
  const { characterId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const character = await db.hanziCharacter.findUnique({
    where: { id: characterId },
    include: { progress: { where: { userId: session.user.id } } },
  });
  if (!character) notFound();

  return <HanziDetailClient character={character} userId={session.user.id} />;
}
