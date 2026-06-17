import { cn } from "@/lib/utils";

interface AmbientProps {
  className?: string;
  /** "rich" hero on light bg · "calm" app chrome · "glow" light orbs on dark-green bg. */
  variant?: "rich" | "calm" | "glow";
}

const ORBS = [
  { cls: "animate-float-y", pos: { top: "-8%", left: "-6%" }, size: 340 },
  { cls: "animate-float-y2", pos: { top: "12%", right: "-8%" }, size: 300 },
  { cls: "animate-drift", pos: { bottom: "-14%", left: "28%" }, size: 380 },
];

const COLORS: Record<NonNullable<AmbientProps["variant"]>, string[]> = {
  rich: ["156 44% 44% / 0.30", "170 44% 48% / 0.26", "150 40% 50% / 0.24"],
  calm: ["156 44% 44% / 0.15", "170 44% 48% / 0.13", "150 40% 50% / 0.13"],
  glow: ["150 78% 92% / 0.50", "168 72% 88% / 0.42", "160 70% 90% / 0.45"],
};

/**
 * Peaceful floating green orbs — a soft, slowly-drifting ambient layer.
 * Pure CSS animations (GPU transforms); safe to render in server components.
 */
export function Ambient({ className, variant = "rich" }: AmbientProps) {
  const colors = COLORS[variant];
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {ORBS.map((o, i) => (
        <div
          key={i}
          className={`orb ${o.cls}`}
          style={{
            ...o.pos,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle, hsl(${colors[i]}), transparent 70%)`,
          }}
        />
      ))}
    </div>
  );
}
