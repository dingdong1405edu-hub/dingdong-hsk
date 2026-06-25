import Link from "next/link";
import { Users, FileDown } from "lucide-react";
import { cn, coverChar, coverGradient, hskBadgeClass, hskLevelLabel } from "@/lib/utils";

const TAG_DOTS = ["bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-sky-500", "bg-violet-500"];

interface TestCardProps {
  href: string;
  title: string;
  level?: string;
  tags?: string[];
  attempts?: number;
  score?: number | null;
  meta?: string;
  seed?: string;
  /** Illustration image for the lesson. Falls back to a gradient + Hán char cover when empty. */
  imageUrl?: string | null;
  /** Khi có → hiện nút "Tải PDF" góc phải (link riêng, không lồng trong link thẻ). */
  pdfHref?: string;
}

export function TestCard({ href, title, level, tags, attempts, score, meta, seed, imageUrl, pdfHref }: TestCardProps) {
  const s = seed ?? href;
  const grad = coverGradient(s);
  const ch = coverChar(s);

  return (
    <div className="group relative block">
      {pdfHref && (
        <Link
          href={pdfHref}
          aria-label="Tải PDF"
          title="Tải PDF"
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow transition-colors hover:bg-card"
        >
          <FileDown className="h-3.5 w-3.5" /> PDF
        </Link>
      )}
      <Link href={href} className="block">
      <div className="h-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-soft-lg">
        {/* Cover */}
        <div className={cn("relative h-28 bg-gradient-to-br", grad)}>
          {imageUrl ? (
            // Uploaded illustration. Plain <img> (not next/image) so any admin-entered
            // URL works without configuring remotePatterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <span className="pointer-events-none absolute inset-0 flex select-none items-center justify-center font-chinese text-7xl text-white/25">
              {ch}
            </span>
          )}
          {typeof attempts === "number" && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
              <Users className="h-3 w-3" /> {attempts} lượt làm
            </span>
          )}
          {level && (
            <span className={cn("absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-bold shadow", hskBadgeClass(level))}>
              {hskLevelLabel(level)}
            </span>
          )}
          {typeof score === "number" && (
            <span className="absolute bottom-2 right-2 rounded-full bg-card/95 px-2 py-0.5 text-[11px] font-bold text-emerald-700 shadow dark:text-emerald-300">
              {Math.round(score)}%
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-3.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold uppercase leading-snug transition-colors group-hover:text-primary">
            {title}
          </h3>
          {meta && <p className="mt-1 text-xs text-muted-foreground">{meta}</p>}
          {tags && tags.length > 0 && (
            <ul className="mt-2 space-y-1">
              {tags.map((t, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", TAG_DOTS[i % TAG_DOTS.length])} />
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </Link>
    </div>
  );
}
