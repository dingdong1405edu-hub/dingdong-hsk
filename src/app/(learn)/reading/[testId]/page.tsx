import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { ReadingTestClient } from "./reading-test-client";

interface Props {
  params: Promise<{ testId: string }>;
}

export default async function ReadingTestPage({ params }: Props) {
  const { testId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const test = await db.readingTest.findUnique({
    where: { id: testId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!test) notFound();

  return <ReadingTestClient test={test} userId={session.user.id} />;
}
