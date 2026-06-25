import Link from "next/link";
import { Sparkles, ArrowRight, Info, CheckCircle2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Accent = "red" | "green" | "blue" | "amber" | "teal" | "rose" | "indigo" | "violet";

const ACCENTS: Record<Accent, { text: string; iconBg: string; btn: string; banner: string }> = {
  red: { text: "text-primary", iconBg: "bg-primary/10 text-primary", btn: "bg-primary hover:bg-primary/90", banner: "border-green-100 from-green-50 to-white dark:border-green-400/20 dark:from-green-500/10 dark:to-transparent" },
  green: { text: "text-emerald-600", iconBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700", banner: "border-emerald-100 from-emerald-50 to-white dark:border-emerald-400/20 dark:from-emerald-500/10 dark:to-transparent" },
  blue: { text: "text-sky-600", iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300", btn: "bg-sky-600 hover:bg-sky-700", banner: "border-sky-100 from-sky-50 to-white dark:border-sky-400/20 dark:from-sky-500/10 dark:to-transparent" },
  amber: { text: "text-amber-600", iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", btn: "bg-amber-500 hover:bg-amber-600", banner: "border-amber-100 from-amber-50 to-white dark:border-amber-400/20 dark:from-amber-500/10 dark:to-transparent" },
  teal: { text: "text-teal-600", iconBg: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300", btn: "bg-teal-600 hover:bg-teal-700", banner: "border-teal-100 from-teal-50 to-white dark:border-teal-400/20 dark:from-teal-500/10 dark:to-transparent" },
  rose: { text: "text-rose-600", iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300", btn: "bg-rose-500 hover:bg-rose-600", banner: "border-rose-100 from-rose-50 to-white dark:border-rose-400/20 dark:from-rose-500/10 dark:to-transparent" },
  indigo: { text: "text-indigo-600", iconBg: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700", banner: "border-indigo-100 from-indigo-50 to-white dark:border-indigo-400/20 dark:from-indigo-500/10 dark:to-transparent" },
  violet: { text: "text-violet-600", iconBg: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", btn: "bg-violet-600 hover:bg-violet-700", banner: "border-violet-100 from-violet-50 to-white dark:border-violet-400/20 dark:from-violet-500/10 dark:to-transparent" },
};

interface PracticeHubProps {
  accent?: Accent;
  icon: React.ReactNode;
  decoChar?: string;
  title: string;
  subtitle: string;
  randomHref?: string;
  randomLabel?: string;
  tips?: string[];
  gridTitle?: string;
  gridSubtitle?: string;
  children?: React.ReactNode;
}

export function PracticeHub({
  accent = "red",
  icon,
  decoChar = "学",
  title,
  subtitle,
  randomHref,
  randomLabel = "AI chọn đề ngẫu nhiên",
  tips,
  gridTitle,
  gridSubtitle,
  children,
}: PracticeHubProps) {
  const a = ACCENTS[accent];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className={cn("relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6", a.banner)}>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm", a.iconBg)}>
              {icon}
            </div>
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">
                Luyện tập <span className={a.text}>{title}</span>
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          {randomHref && (
            <Link href={randomHref} className="shrink-0">
              <Button className={cn("h-11 gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm", a.btn)}>
                <Sparkles className="h-4 w-4" /> {randomLabel} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        <div className="pointer-events-none absolute -right-5 -top-8 select-none font-chinese text-[130px] leading-none text-foreground/[0.04] dark:text-white/[0.05]">
          {decoChar}
        </div>
      </div>

      {/* Info box */}
      {tips && tips.length > 0 && (
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">
            <Info className={cn("h-4 w-4", a.text)} /> Cần biết trước khi làm
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {tips.map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", a.text)} />
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content / grid */}
      {children && (
        <div>
          {gridTitle && (
            <div className="mb-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ListChecks className={cn("h-5 w-5", a.text)} /> {gridTitle}
              </h2>
              {gridSubtitle && <p className="mt-0.5 text-sm text-muted-foreground">{gridSubtitle}</p>}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
