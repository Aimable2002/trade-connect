import { useMemo } from "react";
import type { Deal } from "@/lib/api";
import { pairDeals } from "@/lib/trades";
import { NumericValue } from "@/components/NumericValue";

/**
 * Shared round-trip deal table. MT5 records two deals per trade
 * (`entry: "in"` / `entry: "out"`), so deals are paired first; anything left
 * over (open positions, balance adjustments) is listed separately below.
 * Used by the master-facing history page and the admin master detail page.
 */
export function TradesTable({
  deals,
  emptyLabel = "No deals on this account yet.",
  summary = true,
}: {
  deals: Deal[];
  emptyLabel?: string;
  summary?: boolean;
}) {
  const { trips, unpaired } = useMemo(() => pairDeals(deals), [deals]);

  if (deals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const sortedTrips = [...trips].sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime());

  return (
    <div className="space-y-4">
      {summary && (
        <div className="text-[11px] text-muted-foreground">
          {trips.length} round-trip trade{trips.length === 1 ? "" : "s"}
          {unpaired.length > 0 && <> · {unpaired.length} unpaired deal(s)</>}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Opened</th>
              <th className="px-3 py-2 text-left">Closed</th>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Lots</th>
              <th className="px-3 py-2 text-right">Open</th>
              <th className="px-3 py-2 text-right">Close</th>
              <th className="px-3 py-2 text-right">P&amp;L</th>
              <th className="px-3 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {sortedTrips.map((t) => (
              <tr key={t.key} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 font-mono tabular text-[11px] text-muted-foreground">
                  {fmtDealTime(t.openTime)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono tabular text-[11px] text-muted-foreground">
                  {fmtDealTime(t.closeTime)}
                </td>
                <td className="px-3 py-2 font-mono">{t.symbol}</td>
                <td
                  className={`px-3 py-2 text-xs font-semibold uppercase ${t.side === "buy" ? "text-profit" : "text-loss"}`}
                >
                  {t.side}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular">{t.lots.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono tabular text-muted-foreground">
                  {t.openPrice}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular text-muted-foreground">
                  {t.closePrice}
                </td>
                <td className={`px-3 py-2 text-right ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                  <NumericValue value={t.pnl} format="signed" flash={false} />
                </td>
                <td className={`px-3 py-2 text-right ${t.net >= 0 ? "text-profit" : "text-loss"}`}>
                  <NumericValue value={t.net} format="signed" flash={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {unpaired.length > 0 && (
        <details className="rounded-lg border border-border bg-card p-3 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            {unpaired.length} unpaired deal(s) — open positions or balance adjustments
          </summary>
          <div className="mt-2 space-y-1 font-mono text-[11px]">
            {unpaired.map((d) => (
              <div
                key={d.deal_ticket}
                className="flex items-center justify-between border-t border-border/60 py-1"
              >
                <span>
                  {d.deal_time} · {d.symbol || "—"} · {d.entry}/{d.type}
                </span>
                <span className={d.pnl >= 0 ? "text-profit" : "text-loss"}>
                  <NumericValue value={d.pnl} format="signed" flash={false} />
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export function fmtDealTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
