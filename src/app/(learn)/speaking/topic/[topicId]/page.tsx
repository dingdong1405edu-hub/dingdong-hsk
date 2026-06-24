import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { TopicSpeakingClient, type TopicData } from "./topic-speaking-client";
import type { TopicHint } from "@/components/admin/speaking-topic-fields";

interface Props {
  params: Promise<{ topicId: string }>;
}

function asHints(v: unknown): TopicHint[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((h): h is Record<string, unknown> => !!h && typeof h === "object")
    .map((h) => ({
      text: typeof h.text === "string" ? h.text : "",
      pinyin: typeof h.pinyin === "string" ? h.pinyin : "",
      vi: typeof h.vi === "string" ? h.vi : "",
    }))
    .filter((h) => h.text || h.pinyin || h.vi);
}

export default async function SpeakingTopicPage({ params }: Props) {
  const { topicId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await db.speakingTopic.findUnique({ where: { id: topicId } });
  if (!t || !t.published) notFound(); // chặn truy cập trực tiếp bản nháp

  const data: TopicData = {
    id: t.id,
    hskLevel: t.hskLevel,
    title: t.title,
    topic: t.topic,
    questionZh: t.questionZh,
    questionPinyin: t.questionPinyin,
    questionVi: t.questionVi,
    audioUrl: t.audioUrl,
    transcript: t.transcript,
    hints: asHints(t.hints),
    sampleAnswer: t.sampleAnswer,
    sampleAnswerPinyin: t.sampleAnswerPinyin,
    minChars: t.minChars,
    prepSeconds: t.prepSeconds,
  };

  return <TopicSpeakingClient topic={data} />;
}
