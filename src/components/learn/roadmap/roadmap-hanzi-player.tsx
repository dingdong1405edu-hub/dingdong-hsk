"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Volume2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StrokeOrderCanvas } from "@/components/hanzi/stroke-order-canvas";
import { StrokeQuiz } from "@/components/learn/vocab/stroke-quiz";
import { BaoBuddy } from "@/components/marketing/bao-buddy";
import { playWord } from "@/lib/speech";
import { emitBao } from "@/lib/bao-bus";
import { toneColor, cn } from "@/lib/utils";

interface HanziExample {
  hanzi: string;
  pinyin: string;
  meaning: string;
}
interface HanziItem {
  character: string;
  pinyin: string;
  tone: number;
  meaning: string;
  strokeCount: number;
  examples: HanziExample[];
}

interface Props {
  characters: HanziItem[];
  /** Ghi hoàn thành phần Chữ Hán cho bài lộ trình. */
  onComplete: () => Promise<{ ok: boolean }>;
  closeHref: string;
}

const STEPS = ["Xem nét", "Tô theo", "Tự viết"] as const;

export function RoadmapHanziPlayer({ characters, onComplete, closeHref }: Props) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const finishedRef = useRef(false);

  if (characters.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <BaoBuddy size={88} pose="idle" className="mx-auto" />
        <h2 className="text-xl font-bold">Phần chữ Hán chưa có nội dung</h2>
        <Link href={closeHref}>
          <Button variant="outline">Quay lại</Button>
        </Link>
      </div>
    );
  }

  const item = characters[index];
  const totalSteps = characters.length * STEPS.length;
  const progress = done ? 100 : Math.round(((index * STEPS.length + step) / totalSteps) * 100);

  async function finish() {
    if (finishedRef.current) return; // chặn double-tap (nút + StrokeQuiz onComplete cùng lúc)
    finishedRef.current = true;
    setSaving(true);
    const res = await onComplete();
    setSaving(false);
    if (!res.ok) {
      finishedRef.current = false;
      toast.error("Lỗi lưu kết quả");
      return;
    }
    setDone(true);
    emitBao("complete");
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else if (index < characters.length - 1) {
      setIndex((i) => i + 1);
      setStep(0);
    } else {
      void finish();
    }
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="space-y-4 px-6 pb-6 pt-8">
            <BaoBuddy size={104} pose="cheer" message="写得好!" className="mx-auto" />
            <h2 className="text-2xl font-bold">Hoàn thành phần Chữ Hán!</h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã luyện viết {characters.length} chữ. Tiếp tục các phần khác để hoàn thành bài.
            </p>
            <Link href={closeHref}>
              <Button className="w-full">Quay lại bài học</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <Link href={closeHref} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Progress value={progress} className="h-2 flex-1" />
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {index + 1}/{characters.length}
        </span>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {/* Header chữ */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn("font-chinese text-5xl font-bold", toneColor(item.tone))}>{item.character}</span>
              <div>
                <div className="font-pinyin text-lg">{item.pinyin}</div>
                <div className="text-sm text-muted-foreground">{item.meaning}</div>
                {item.strokeCount > 0 && (
                  <div className="text-xs text-muted-foreground">{item.strokeCount} nét</div>
                )}
              </div>
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => playWord({ hanzi: item.character })}
              aria-label="Nghe phát âm"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {STEPS[step]}
          </div>

          {/* Nội dung theo bước */}
          <div className="flex justify-center">
            {step === 0 ? (
              <StrokeOrderCanvas character={item.character} size={220} animate />
            ) : (
              <StrokeQuiz
                key={`${index}-${step}`}
                character={item.character}
                mode={step === 1 ? "trace" : "recall"}
                onComplete={() => next()}
              />
            )}
          </div>

          {/* Ví dụ */}
          {item.examples.length > 0 && (
            <div className="space-y-1.5 rounded-xl bg-muted/40 p-3">
              <div className="text-xs font-semibold text-muted-foreground">Ví dụ</div>
              {item.examples.map((ex, i) => (
                <div key={i} className="text-sm">
                  <span className="font-chinese">{ex.hanzi}</span>
                  {ex.pinyin && <span className="ml-2 font-pinyin text-xs text-muted-foreground">{ex.pinyin}</span>}
                  {ex.meaning && <span className="ml-2 text-muted-foreground">— {ex.meaning}</span>}
                </div>
              ))}
            </div>
          )}

          {step === 0 && (
            <Button className="w-full gap-1.5" onClick={next} disabled={saving}>
              Tập viết <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {step > 0 && (
            <Button variant="outline" className="w-full gap-1.5" onClick={next} disabled={saving}>
              <Check className="h-4 w-4" /> {index === characters.length - 1 && step === STEPS.length - 1 ? "Hoàn thành" : "Bỏ qua bước này"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
