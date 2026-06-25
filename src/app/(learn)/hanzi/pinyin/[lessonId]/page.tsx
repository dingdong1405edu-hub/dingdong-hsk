import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getPinyinLesson } from "@/lib/pinyin-lessons";
import { PinyinFlow } from "@/components/learn/pinyin/pinyin-flow";

interface Props {
  params: Promise<{ lessonId: string }>;
}

export default async function PinyinLessonPage({ params }: Props) {
  const { lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lesson = getPinyinLesson(lessonId);
  if (!lesson) notFound();

  return <PinyinFlow lesson={lesson} />;
}
