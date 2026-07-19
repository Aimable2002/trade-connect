import { cn } from "@/lib/utils";

export function RiskBadge({ risk }: { risk: number }) {
  const clamped = Math.max(1, Math.min(10, Math.round(risk)));
  const tier =
    clamped <= 3 ? "low" : clamped <= 6 ? "mid" : clamped <= 8 ? "mid" : "high";
  const color =
    tier === "low"
      ? "bg-risk-low/15 text-risk-low border-risk-low/40"
      : tier === "mid"
        ? "bg-risk-mid/15 text-risk-mid border-risk-mid/40"
        : "bg-risk-high/15 text-risk-high border-risk-high/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono tabular text-[11px] font-semibold",
        color,
      )}
      title={`Risk ${clamped}/10`}
    >
      <span className="text-[9px] uppercase tracking-widest opacity-70">
        Risk
      </span>
      {clamped}/10
    </span>
  );
}
