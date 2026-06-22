import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SpeakingClient } from "./speaking-client";

interface Props {
  params: Promise<{ setId: string }>;
}

export default async function SpeakingSetPage({ params }: Props) {
  const { setId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const set = await db.speakingSet.findUnique({ where: { id: setId } });
  if (!set || !set.published) notFound(); // chặn truy cập trực tiếp bộ nháp

  return <SpeakingClient set={set} userId={session.user.id} />;
}
