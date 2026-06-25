"use client";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, PenLine, PencilLine, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrokeOrderCanvas } from "@/components/hanzi/stroke-order-canvas";
import { StrokeQuiz } from "@/components/learn/vocab/stroke-quiz";
import { toneColor, hskLevelLabel } from "@/lib/utils";
import { markHanziMasteredAction, recordHanziWriteAction } from "@/server/actions/hanzi";
import type { HSKLevel } from "@prisma/client";

// Full, static class strings so Tailwind's JIT actually generates them
// (interpolated `bg-${color}-100` names are never emitted).
const TONE_BADGE: Record<number, string> = {
  1: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  2: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  3: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  4: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  0: "bg-muted text-muted-foreground",
};

interface Example {
  sentence: string;
  pinyin: string;
  meaning: string;
}

interface CharacterData {
  id: string;
  character: string;
  pinyin: string;
  tone: number;
  meaning: string;
  hskLevel: HSKLevel;
  strokeCount: number;
  strokeOrder: unknown;
  examples: unknown;
  progress: Array<{ mastered: boolean }>;
}

interface Props {
  character: CharacterData;
  userId: string;
}

export function HanziDetailClient({ character, userId }: Props) {
  const [mastered, setMastered] = useState(character.progress.some((p) => p.mastered));
  const examples = character.examples as Example[];

  // Tránh gọi server lặp khi StrokeQuiz re-render trong cùng một lần luyện.
  const tracedOnce = useRef(false);
  const recalledOnce = useRef(false);

  async function handleMastered() {
    const res = await markHanziMasteredAction(character.id);
    if (res.ok) {
      setMastered(true);
      toast.success(res.xpGain ? `Đã đánh dấu thành thạo! +${res.xpGain} XP` : "Đã đánh dấu thành thạo!");
    }
  }

  // `genuine` là false khi chữ không có dữ liệu nét (rơi vào viết tay tự do) — khi
  // đó không tính là hoàn thành, không cộng XP / đánh dấu thành thạo.
  const handleTraceComplete = useCallback(async (genuine: boolean) => {
    if (!genuine || tracedOnce.current) return;
    tracedOnce.current = true;
    const res = await recordHanziWriteAction(character.id, "trace");
    if (res.ok) {
      toast.success(res.xpGain ? `Viết theo mẫu xong! +${res.xpGain} XP` : "Viết theo mẫu xong!");
    }
  }, [character.id]);

  const handleRecallComplete = useCallback(async (genuine: boolean) => {
    if (!genuine || recalledOnce.current) return;
    recalledOnce.current = true;
    const res = await recordHanziWriteAction(character.id, "recall");
    if (res.ok) {
      setMastered(true);
      toast.success(
        res.xpGain
          ? `Tuyệt vời! Viết đúng từ trí nhớ. +${res.xpGain} XP`
          : "Tuyệt vời! Viết đúng từ trí nhớ."
      );
    }
  }, [character.id]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`font-chinese text-7xl font-bold ${toneColor(character.tone)}`}>
            {character.character}
          </div>
          <div>
            <div className="font-pinyin text-2xl">{character.pinyin}</div>
            <div className="text-muted-foreground">{character.meaning}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{hskLevelLabel(character.hskLevel)}</Badge>
              <Badge variant="secondary">{character.strokeCount} nét</Badge>
              <Badge className={`${TONE_BADGE[character.tone] ?? TONE_BADGE[0]} border-0`}>
                Thanh {character.tone === 0 ? "nhẹ" : character.tone}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          onClick={handleMastered}
          disabled={mastered}
          variant={mastered ? "outline" : "default"}
        >
          {mastered ? "Đã thành thạo ✓" : "Đánh dấu thành thạo"}
        </Button>
      </div>

      <Tabs defaultValue="animation">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="animation" aria-label="Xem nét" className="gap-1.5 text-xs sm:text-sm">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Xem nét</span>
          </TabsTrigger>
          <TabsTrigger value="trace" className="gap-1.5 text-xs sm:text-sm">
            <PenLine className="h-4 w-4" />
            <span className="hidden sm:inline">Viết theo mẫu</span>
            <span className="sm:hidden">Theo mẫu</span>
          </TabsTrigger>
          <TabsTrigger value="recall" aria-label="Tập viết" className="gap-1.5 text-xs sm:text-sm">
            <PencilLine className="h-4 w-4" />
            <span>Tập viết</span>
          </TabsTrigger>
          <TabsTrigger value="examples" aria-label="Ví dụ" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Ví dụ</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="animation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Thứ tự nét bút</CardTitle>
            </CardHeader>
            <CardContent>
              <StrokeOrderCanvas character={character.character} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trace">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Viết theo mẫu</CardTitle>
            </CardHeader>
            <CardContent>
              <StrokeQuiz
                key={`${character.id}-trace`}
                mode="trace"
                character={character.character}
                onComplete={handleTraceComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recall">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tập viết từ trí nhớ</CardTitle>
            </CardHeader>
            <CardContent>
              <StrokeQuiz
                key={`${character.id}-recall`}
                mode="recall"
                character={character.character}
                onComplete={handleRecallComplete}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples">
          <Card>
            <CardContent className="space-y-4 pt-6">
              {examples.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Chưa có ví dụ cho chữ này.
                </p>
              ) : (
                examples.map((ex, i) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="font-chinese text-xl font-semibold">{ex.sentence}</div>
                    <div className="font-pinyin text-sm text-muted-foreground">{ex.pinyin}</div>
                    <div className="mt-1 text-sm">{ex.meaning}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
