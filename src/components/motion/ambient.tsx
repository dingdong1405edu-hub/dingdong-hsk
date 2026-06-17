import { cn } from "@/lib/utils";

interface AmbientProps {
  className?: string;
  /** "rich" for hero (brighter orbs), "calm" for app chrome backgrounds. */
  variant?: "rich" | "calm";
}

/**
 * Peaceful floating green orbs — a soft, slowly-drifting ambient layer.
 * Pure CSS animations (GPU transforms); safe to render in server components.
 */
export function Ambient({ className, variant = "rich" }: AmbientProps) {
  const a = variant === "rich" ? 1 : 0.6;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <div
        className="orb animate-float-y"
        style={{
          top: "-8%",
          left: "-6%",
          width: 340,
          height: 340,
          background: `radial-gradient(circle, hsl(130 52% 46% / ${0.32 * a}), transparent 70%)`,
        }}
      />
      <div
        className="orb animate-float-y2"
        style={{
          top: "12%",
          right: "-8%",
          width: 300,
          height: 300,
          background: `radial-gradient(circle, hsl(150 55% 50% / ${0.28 * a}), transparent 70%)`,
        }}
      />
      <div
        className="orb animate-drift"
        style={{
          bottom: "-14%",
          left: "28%",
          width: 380,
          height: 380,
          background: `radial-gradient(circle, hsl(96 55% 56% / ${0.26 * a}), transparent 70%)`,
        }}
      />
    </div>
  );
}
