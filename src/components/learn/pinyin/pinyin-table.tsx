"use client";
import Link from "next/link";
import { Volume2, ArrowRight } from "lucide-react";
import { speakChinese } from "@/lib/speech";
import { toneColor, cn } from "@/lib/utils";
import {
  INITIALS,
  FINALS,
  TONES,
  INITIAL_GROUPS,
  FINAL_GROUPS,
  type Sound,
} from "@/lib/pinyin-data";

function Tile({ sound, hanzi, pinyin, tone }: { sound: string; hanzi: string; pinyin: string; tone: number }) {
  return (
    <button
      type="button"
      onClick={() => speakChinese(hanzi)}
      aria-label={`Nghe ${pinyin}`}
      className="group flex flex-col items-center gap-0.5 rounded-xl border border-border/70 bg-card p-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-soft active:scale-95"
    >
      <span className="font-pinyin text-lg font-bold leading-none text-amber-600 dark:text-amber-400">{sound}</span>
      <span className={cn("font-chinese text-base leading-tight", toneColor(tone))}>{hanzi}</span>
      <span className={cn("font-pinyin text-[11px] leading-none", toneColor(tone))}>{pinyin}</span>
    </button>
  );
}

function GroupBlock({ title, lessonId, items }: { title: string; lessonId: string; items: Sound[] }) {
  return (
    <div className="rounded-2xl border bg-muted/30 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold">{title}</h4>
        <Link
          href={`/hanzi/pinyin/${lessonId}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
        >
          Luyện <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {items.map((s) => (
          <Tile key={s.sound} sound={s.sound} hanzi={s.hanzi} pinyin={s.pinyin} tone={s.tone} />
        ))}
      </div>
    </div>
  );
}

export function PinyinTable() {
  return (
    <div className="space-y-7">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Volume2 className="h-3.5 w-3.5" /> Nhấn vào bất kỳ ô nào để nghe phát âm.
      </p>

      {/* Thanh điệu */}
      <section>
        <h3 className="mb-2.5 text-base font-bold">Thanh điệu (声调)</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {TONES.map((t) => (
            <Tile key={t.tone} sound={t.mark} hanzi={t.hanzi} pinyin={t.pinyin} tone={t.tone} />
          ))}
        </div>
      </section>

      {/* Thanh mẫu */}
      <section>
        <h3 className="mb-2.5 text-base font-bold">Thanh mẫu (声母) — 21 phụ âm đầu</h3>
        <div className="space-y-3">
          {INITIAL_GROUPS.map((g) => (
            <GroupBlock
              key={g.title}
              title={g.title}
              lessonId={g.lessonId}
              items={INITIALS.filter((s) => s.family === g.family)}
            />
          ))}
        </div>
      </section>

      {/* Vận mẫu */}
      <section>
        <h3 className="mb-2.5 text-base font-bold">Vận mẫu (韵母) — phần vần</h3>
        <div className="space-y-3">
          {FINAL_GROUPS.map((g) => (
            <GroupBlock
              key={g.title}
              title={g.title}
              lessonId={g.lessonId}
              items={FINALS.filter((s) => s.family === g.family)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
