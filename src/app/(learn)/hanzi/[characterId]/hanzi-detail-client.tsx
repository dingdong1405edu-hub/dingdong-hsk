"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrokeOrderCanvas } from "@/components/hanzi/stroke-order-canvas";
import { toneColor, hskLevelLabel } from "@/lib/utils";
import { markHanziMasteredAction } from "@/server/actions/hanzi";
import type { HSKLevel } from "@prisma/client";

// Full, static class strings so Tailwind's JIT actually generates them
// (interpolated `bg-${color}-100` names are never emitted).
const TONE_BADGE: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-green-100 text-green-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-purple-100 text-purple-700",
  0: "bg-zinc-100 text-zinc-700",
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

  async function handleMastered() {
    const res = await markHanziMasteredAction(character.id);
    if (res.ok) {
      setMastered(true);
      toast.success("Đã đánh dấu thành thạo!");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`text-7xl font-chinese font-bold ${toneColor(character.tone)}`}>
            {character.character}
          </div>
          <div>
            <div className="font-pinyin text-2xl">{character.pinyin}</div>
            <div className="text-muted-foreground">{character.meaning}</div>
            <div className="flex items-center gap-2 mt-1">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="animation">Stroke Order</TabsTrigger>
          <TabsTrigger value="examples">Ví dụ</TabsTrigger>
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
        <TabsContent value="examples">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {examples.map((ex, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="font-chinese text-xl font-semibold">{ex.sentence}</div>
                  <div className="font-pinyin text-sm text-muted-foreground">{ex.pinyin}</div>
                  <div className="text-sm mt-1">{ex.meaning}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
