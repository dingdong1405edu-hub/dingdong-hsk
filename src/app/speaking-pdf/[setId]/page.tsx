import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SpeakingPdf } from "@/components/learn/speaking/speaking-pdf";

interface Props {
  params: Promise<{ setId: string }>;
}

function toSentences(raw: unknown): { text: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { text: String(o.text ?? o.hanzi ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((s) => s.text);
}
function toPassage(raw: unknown): { text: string; pinyin?: string } | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const text = String(o.text ?? o.hanzi ?? "");
  return text ? { text, pinyin: o.pinyin ? String(o.pinyin) : undefined } : null;
}
function toQuestions(raw: unknown): { question: string; pinyin?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return { question: String(o.question ?? o.text ?? ""), pinyin: o.pinyin ? String(o.pinyin) : undefined };
    })
    .filter((q) => q.question);
}

export default async function SpeakingPdfPage({ params }: Props) {
  const { setId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const set = await db.speakingSet.findUnique({ where: { id: setId } });
  if (!set || !set.published) notFound();

  return (
    <div className="min-h-screen bg-muted/20 px-4 py-6">
      <SpeakingPdf
        title={set.title || "Bài luyện nói"}
        hskLevel={set.hskLevel}
        part1={toSentences(set.part1Sentences)}
        part2={toPassage(set.part2Passage)}
        part3={toQuestions(set.part3Questions)}
        backHref="/speaking"
      />
    </div>
  );
}
