import { cn } from "@/lib/utils";
import type { SizingMode } from "@/lib/supabase";

const OPTIONS: { value: SizingMode; label: string; hint: string }[] = [
  {
    value: "fixed_multiplier",
    label: "Fixed multiplier",
    hint: "Multiply master lots by a constant",
  },
  {
    value: "balance_proportional",
    label: "Balance proportional",
    hint: "Scale by your balance vs master's",
  },
  {
    value: "fixed_master_balance_percentage",
    label: "% of master balance",
    hint: "Trade a fixed % of master equity",
  },
];

export function SizingModeSelect({
  value,
  onChange,
}: {
  value: SizingMode;
  onChange: (v: SizingMode) => void;
}) {
  return (
    <div className="grid gap-2">
      {OPTIONS.map((o) => (
        <button
          type="button"
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-start gap-3 rounded-md border px-3 py-2 text-left transition-colors",
            value === o.value
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/40",
          )}
        >
          <span
            className={cn(
              "mt-1 h-3 w-3 shrink-0 rounded-full border",
              value === o.value ? "border-primary bg-primary" : "border-border",
            )}
          />
          <div className="min-w-0">
            <div className="text-sm font-medium">{o.label}</div>
            <div className="text-xs text-muted-foreground">{o.hint}</div>
            <div className="mt-0.5 font-mono text-[10px] text-muted-foreground/60">
              {o.value}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
