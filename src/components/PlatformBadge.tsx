import type { AccountPlatform } from "@/lib/supabase";

/**
 * Absent/undefined is treated as "mt5" - matches the DB column's own
 * default (see copydesk_fanout/migrations/001_ctrader_support.sql) for
 * rows created before the platform column existed.
 */
export function PlatformBadge({ platform }: { platform?: AccountPlatform }) {
  const resolved = platform ?? "mt5";
  const label = resolved === "ctrader" ? "cTrader" : "MT5";
  return (
    <span
      className={
        resolved === "ctrader"
          ? "rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-sky-400"
          : "rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
      }
    >
      {label}
    </span>
  );
}