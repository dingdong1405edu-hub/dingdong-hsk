import { cn } from "@/lib/utils";

/** DingDong HSK brand mark (bánh bao logo). Pass sizing via className, e.g. "h-9 w-9". */
export function Logo({ className, alt = "DingDong HSK" }: { className?: string; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo-hsk.png" alt={alt} className={cn("shrink-0 select-none object-contain", className)} />
  );
}
