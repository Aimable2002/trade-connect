import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  mastersDirectoryQueryOptions,
  masterRateQueryOptions,
  masterTradesQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import {
  avgLoss,
  avgWin,
  bySymbol,
  byHourOfDay,
  equityCurve,
  maxDrawdownAbs,
  maxDrawdownPct,
  pairDeals,
  profitFactor,
  roiPct,
  trackRecordDays,
  winRate,
} from "@/lib/trades";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/insight/$accountId")({
  component: Insight,
});

function Insight() {
  const { accountId } = Route.useParams();
  const { data: directory } = useQuery(mastersDirectoryQueryOptions());
  const { data: rate } = useQuery(masterRateQueryOptions(accountId));
  const {
    data: deals,
    isLoading,
    error,
  } = useQuery(masterTradesQueryOptions(accountId));

  const master = (directory ?? []).find((m) => m.account_id === accountId);

  const stats = useMemo(() => {
    if (!deals) return null;
    return {
      roi: roiPct(deals),
      dd: maxDrawdownAbs(deals),
      ddPct: maxDrawdownPct(deals),
      pf: profitFactor(deals),
      wr: winRate(deals, 365 * 10),
      aw: avgWin(deals),
      al: avgLoss(deals),
      track: trackRecordDays(deals),
      curve: equityCurve(deals),
      symbols: bySymbol(deals),
      hours: byHourOfDay(deals),
      trips: pairDeals(deals).trips,
    };
  }, [deals]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <Link
        to="/masters"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to directory
      </Link>

      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Master insight
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-semibold">
            {master?.display_name ?? accountId}
          </h1>
          {rate && (
            <span className="rounded border border-border bg-muted/40 px-2 py-0.5 font-mono text-xs">
              Rate: {rate.rate_percent}%
            </span>
          )}
        </div>
        <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
          {accountId}
        </div>
        {master?.bio && (
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {master.bio}
          </p>
        )}
      </header>

      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Pulling deals from MT5 terminal (~10s)…
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-xs text-loss">
          Couldn't load trades: {(error as Error).message}
        </div>
      )}

      {stats && (
        <>
          <StatsGrid stats={stats} />
          <EquitySection curve={stats.curve} />
          <SymbolBreakdown rows={stats.symbols} />
          <HourHeatmap bins={stats.hours} />
          <RecentTrips trips={stats.trips} />
        </>
      )}
    </div>
  );
}

function StatsGrid({
  stats,
}: {
  stats: {
    roi: number | null;
    dd: number;
    ddPct: number | null;
    pf: number | null;
    wr: number | null;
    aw: number | null;
    al: number | null;
    track: number | null;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
      <StatBox label="ROI">
        {stats.roi === null ? (
          "—"
        ) : (
          <span className={stats.roi >= 0 ? "text-profit" : "text-loss"}>
            <NumericValue value={stats.roi} decimals={1} flash={false} />%
          </span>
        )}
      </StatBox>
      <StatBox label="Max DD">
        <NumericValue value={stats.dd} flash={false} />
        {stats.ddPct !== null && (
          <span className="ml-1 text-[10px] text-muted-foreground">
            ({stats.ddPct.toFixed(1)}%)
          </span>
        )}
      </StatBox>
      <StatBox label="Profit factor">
        {stats.pf === null
          ? "—"
          : stats.pf === Infinity
            ? "∞"
            : stats.pf.toFixed(2)}
      </StatBox>
      <StatBox label="Win rate">
        {stats.wr === null ? (
          "—"
        ) : (
          <>
            <NumericValue value={stats.wr * 100} decimals={0} flash={false} />%
          </>
        )}
      </StatBox>
      <StatBox label="Avg win">
        {stats.aw === null ? "—" : <NumericValue value={stats.aw} flash={false} />}
      </StatBox>
      <StatBox label="Avg loss">
        {stats.al === null ? "—" : <NumericValue value={stats.al} flash={false} />}
      </StatBox>
      <StatBox label="Track record">
        {stats.track === null ? "—" : `${stats.track} days`}
      </StatBox>
    </div>
  );
}

function StatBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm">{children}</div>
    </div>
  );
}

function EquitySection({
  curve,
}: {
  curve: { time: Date; equity: number }[];
}) {
  if (curve.length < 2) return null;
  const w = 800;
  const h = 200;
  const pad = 4;
  const min = Math.min(...curve.map((p) => p.equity));
  const max = Math.max(...curve.map((p) => p.equity));
  const range = max - min || 1;
  const t0 = curve[0].time.getTime();
  const tN = curve[curve.length - 1].time.getTime();
  const span = tN - t0 || 1;
  const pts = curve
    .map((p) => {
      const x = pad + ((p.time.getTime() - t0) / span) * (w - pad * 2);
      const y = h - pad - ((p.equity - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const last = curve[curve.length - 1].equity;
  const first = curve[0].equity;
  const up = last >= first;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Equity curve
        </div>
        <div className="font-mono text-xs">
          <NumericValue value={first} format="currency" flash={false} /> →{" "}
          <NumericValue value={last} format="currency" flash={false} />
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="h-40 w-full min-w-[600px]"
          preserveAspectRatio="none"
        >
          <polyline
            fill="none"
            stroke={up ? "hsl(var(--profit))" : "hsl(var(--loss))"}
            strokeWidth="1.5"
            points={pts}
          />
        </svg>
      </div>
    </section>
  );
}

function SymbolBreakdown({
  rows,
}: {
  rows: { symbol: string; trades: number; net: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        By symbol
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-2 py-1 text-left">Symbol</th>
              <th className="px-2 py-1 text-right">Trades</th>
              <th className="px-2 py-1 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol} className="border-t border-border">
                <td className="px-2 py-1.5 font-mono">{r.symbol}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {r.trades}
                </td>
                <td
                  className={`px-2 py-1.5 text-right font-mono ${r.net >= 0 ? "text-profit" : "text-loss"}`}
                >
                  <NumericValue value={r.net} format="signed" flash={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HourHeatmap({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Trading hours (UTC)
      </div>
      <div className="mt-3 grid grid-cols-24 gap-0.5">
        {bins.map((n, i) => (
          <div
            key={i}
            title={`${String(i).padStart(2, "0")}:00 — ${n} closes`}
            className="h-8 rounded-sm bg-primary/10"
            style={{
              backgroundColor: `hsl(var(--primary) / ${(n / max) * 0.9 + 0.05})`,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-muted-foreground">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>23</span>
      </div>
    </section>
  );
}

function RecentTrips({
  trips,
}: {
  trips: import("@/lib/trades").RoundTrip[];
}) {
  if (trips.length === 0) return null;
  const sorted = [...trips].sort(
    (a, b) => b.closeTime.getTime() - a.closeTime.getTime(),
  );
  return (
    <section className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Trade log ({trips.length})
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Closed</th>
              <th className="px-3 py-2 text-left">Symbol</th>
              <th className="px-3 py-2 text-left">Side</th>
              <th className="px-3 py-2 text-right">Lots</th>
              <th className="px-3 py-2 text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((t) => (
              <tr key={t.key} className="border-t border-border">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {t.closeTime.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-3 py-2 font-mono">{t.symbol}</td>
                <td
                  className={`px-3 py-2 text-xs font-semibold uppercase ${t.side === "buy" ? "text-profit" : "text-loss"}`}
                >
                  {t.side}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {t.lots.toFixed(2)}
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
    </section>
  );
}
