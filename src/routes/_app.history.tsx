import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accountsQueryOptions } from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";
import { useState } from "react";

export const Route = createFileRoute("/_app/history")({
  component: History,
});

const SAMPLE_TRADES = [
  { id: "t1", opened: "2026-07-18 14:22", symbol: "EURUSD", side: "buy", lots: 0.10, status: "closed", pnl: 32.15 },
  { id: "t2", opened: "2026-07-18 12:04", symbol: "XAUUSD", side: "sell", lots: 0.05, status: "closed", pnl: -18.40 },
  { id: "t3", opened: "2026-07-18 09:41", symbol: "GBPJPY", side: "buy", lots: 0.20, status: "open", pnl: null },
  { id: "t4", opened: "2026-07-17 22:10", symbol: "US500", side: "buy", lots: 0.50, status: "closed", pnl: 74.90 },
  { id: "t5", opened: "2026-07-17 16:55", symbol: "USDJPY", side: "sell", lots: 0.30, status: "closed", pnl: -12.05 },
];

function History() {
  const { data: accounts } = useQuery(accountsQueryOptions());
  const [selected, setSelected] = useState<string | "all">("all");

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Log
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Trade history</h1>
      </header>
      <PlaceholderBanner text="Preview trades — real per-account trade log ships next." />

      <div className="flex flex-wrap gap-1">
        <FilterChip
          label="All accounts"
          active={selected === "all"}
          onClick={() => setSelected("all")}
        />
        {(accounts ?? []).map((a) => (
          <FilterChip
            key={a.account_id}
            label={`${a.role} · ${a.account_id.slice(0, 6)}…`}
            active={selected === a.account_id}
            onClick={() => setSelected(a.account_id)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Opened</th>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Lots</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-right">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {SAMPLE_TRADES.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono tabular text-[11px] text-muted-foreground">
                  {t.opened}
                </td>
                <td className="px-3 py-2 font-mono">{t.symbol}</td>
                <td
                  className={`px-3 py-2 text-xs font-semibold uppercase ${t.side === "buy" ? "text-profit" : "text-loss"}`}
                >
                  {t.side}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular">
                  {t.lots.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {t.status}
                </td>
                <td
                  className={`px-3 py-2 text-right ${
                    t.pnl === null
                      ? "text-muted-foreground"
                      : t.pnl >= 0
                        ? "text-profit"
                        : "text-loss"
                  }`}
                >
                  {t.pnl === null ? (
                    "—"
                  ) : (
                    <NumericValue value={t.pnl} format="signed" flash={false} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded border border-primary bg-primary/10 px-2 py-1 text-[11px] text-primary"
          : "rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40"
      }
    >
      {label}
    </button>
  );
}
