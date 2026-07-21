import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  accountTradesQueryOptions,
  accountsQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { useEffect, useMemo, useState } from "react";
import { pairDeals } from "@/lib/trades";
import { Loader2 } from "lucide-react";
import type { Deal } from "@/lib/api";

export const Route = createFileRoute("/_app/history")({
  component: History,
});

function History() {
  const { data: accounts } = useQuery(accountsQueryOptions());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && accounts && accounts.length > 0) {
      setSelected(accounts[0].account_id);
    }
  }, [accounts, selected]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Log
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Trade history</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Live pull from the MT5 terminal — the first request per account
          takes about 10 seconds.
        </p>
      </header>

      <div className="flex flex-wrap gap-1">
        {(accounts ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground">
            No accounts yet. Provision one from Onboarding.
          </div>
        )}
        {(accounts ?? []).map((a) => (
          <FilterChip
            key={a.account_id}
            label={`${a.role} · ${a.account_id.slice(0, 8)}…`}
            active={selected === a.account_id}
            onClick={() => setSelected(a.account_id)}
          />
        ))}
      </div>

      {selected && <AccountTrades accountId={selected} />}
    </div>
  );
}

function AccountTrades({ accountId }: { accountId: string }) {
  const { data: deals, isLoading, isFetching, error, refetch } = useQuery(
    accountTradesQueryOptions(accountId),
  );

  const { trips, unpaired } = useMemo(() => {
    if (!deals) return { trips: [], unpaired: [] as Deal[] };
    return pairDeals(deals);
  }, [deals]);

  if (isLoading) return <LoadingCard />;

  if (error) {
    return (
      <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-xs text-loss">
        <div>Couldn't load trades: {(error as Error).message}</div>
        <button
          onClick={() => refetch()}
          className="mt-2 rounded border border-loss/40 px-2 py-1 text-[11px]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!deals || deals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        No deals on this account yet.
      </div>
    );
  }

  const sortedTrips = [...trips].sort(
    (a, b) => b.closeTime.getTime() - a.closeTime.getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div>
          {trips.length} round-trip trade{trips.length === 1 ? "" : "s"}
          {unpaired.length > 0 && <> · {unpaired.length} unpaired deal(s)</>}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          Refresh
        </button>
      </div>

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
                  {fmt(t.openTime)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 font-mono tabular text-[11px] text-muted-foreground">
                  {fmt(t.closeTime)}
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
                <td className="px-3 py-2 text-right font-mono tabular text-muted-foreground">
                  {t.openPrice}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular text-muted-foreground">
                  {t.closePrice}
                </td>
                <td
                  className={`px-3 py-2 text-right ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}
                >
                  <NumericValue value={t.pnl} format="signed" flash={false} />
                </td>
                <td
                  className={`px-3 py-2 text-right ${t.net >= 0 ? "text-profit" : "text-loss"}`}
                >
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
            {unpaired.length} unpaired deal(s) — open positions or balance
            adjustments
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

function LoadingCard() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const pct = Math.min(100, (elapsed / 10) * 100);
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        Pulling deals from MT5 terminal…
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
        {elapsed}s elapsed · typically ~10s
      </div>
    </div>
  );
}

function fmt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
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
