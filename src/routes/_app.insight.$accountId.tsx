import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  mastersDirectoryQueryOptions,
  masterRateQueryOptions,
  masterTradesQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { PlatformBadge } from "@/components/PlatformBadge";
import { PatientLoader, ErrorState } from "@/components/DataState";
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
  netPnl,
  trackRecordDays,
  winRate,
} from "@/lib/trades";
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_app/insight/$accountId")({
  component: Insight,
});

function Insight() {
  const { accountId } = Route.useParams();
  const { data: directory } = useQuery(mastersDirectoryQueryOptions());
  const { data: rate } = useQuery(masterRateQueryOptions(accountId));
  const { data: deals, isLoading, error, refetch } = useQuery(masterTradesQueryOptions(accountId));

  const master = (directory ?? []).find((m) => m.account_id === accountId);

  const stats = useMemo(() => {
    if (!deals) return null;
    return {
      pnl: netPnl(deals),
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
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 md:p-8 md:pb-8">
      <Link
        to="/masters"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to directory
      </Link>

      <HeroHeader accountId={accountId} master={master} ratePercent={rate?.rate_percent} />

      {isLoading && (
        <PatientLoader
          label="Pulling this master's trade history…"
          slowLabel="Live master stats are computed straight from their trade history, which can be slow to fetch when the source is busy. Hang tight — it'll finish."
        />
      )}
      {error && (
        <ErrorState
          message={`Couldn't load trades: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      {stats && (
        <>
          <KpiGrid stats={stats} />
          <div className="grid gap-4 lg:grid-cols-3">
            <EquitySection curve={stats.curve} className="lg:col-span-2" />
            <RiskPanel stats={stats} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <SymbolBreakdown rows={stats.symbols} />
            <HourHeatmap bins={stats.hours} />
          </div>
          <RecentTrips trips={stats.trips} />
        </>
      )}

      {stats && <StickyFollowBar accountId={accountId} ratePercent={rate?.rate_percent} />}
    </div>
  );
}

/* ---------------- hero / sell ---------------- */

function HeroHeader({
  accountId,
  master,
  ratePercent,
}: {
  accountId: string;
  master: { display_name: string; bio?: string; platform?: "mt5" | "ctrader" } | undefined;
  ratePercent: number | undefined;
}) {
  return (
    <header className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" /> Master insight
          </div>
          <h1 className="mt-1 text-2xl font-semibold md:text-3xl">
            {master?.display_name ?? accountId}
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="truncate font-mono text-[11px] text-muted-foreground">
              {accountId}
            </span>
            <PlatformBadge platform={master?.platform} />
          </div>
          {master?.bio && (
            <p className="mt-3 max-w-xl text-sm text-muted-foreground">{master.bio}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          {ratePercent !== undefined && (
            <div className="rounded-lg border border-border bg-background/60 px-3 py-2 text-right">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Performance fee
              </div>
              <div className="font-mono text-lg font-semibold">{ratePercent}%</div>
              <div className="text-[10px] text-muted-foreground">
                of your profit, charged only when you win
              </div>
            </div>
          )}
          <Link
            to="/onboarding"
            search={{ master: accountId }}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            Copy this master <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function StickyFollowBar({
  accountId,
  ratePercent,
}: {
  accountId: string;
  ratePercent: number | undefined;
}) {
  return (
    <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card/95 p-3 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="text-xs">
          <div className="text-muted-foreground">Performance fee</div>
          <div className="font-mono font-semibold">
            {ratePercent !== undefined ? `${ratePercent}%` : "—"}
          </div>
        </div>
        <Link
          to="/onboarding"
          search={{ master: accountId }}
          className="flex-1 rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
        >
          Copy this master
        </Link>
      </div>
    </div>
  );
}

/* ---------------- KPIs ---------------- */

function KpiGrid({
  stats,
}: {
  stats: {
    pnl: number;
    dd: number;
    ddPct: number | null;
    pf: number | null;
    wr: number | null;
    aw: number | null;
    al: number | null;
    track: number | null;
  };
}) {
  const pnlPositive = stats.pnl >= 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <KpiCard
        label="All-time net P&L"
        accent={pnlPositive ? "profit" : "loss"}
        icon={pnlPositive ? TrendingUp : TrendingDown}
        value={<NumericValue value={stats.pnl} format="signed" flash={false} />}
      />
      <KpiCard
        label="Max drawdown"
        value={
          <>
            <NumericValue value={stats.dd} format="currency" flash={false} />
            {stats.ddPct !== null && (
              <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                ({stats.ddPct.toFixed(1)}%)
              </span>
            )}
          </>
        }
      />
      <KpiCard
        label="Profit factor"
        value={stats.pf === null ? "—" : stats.pf === Infinity ? "∞" : stats.pf.toFixed(2)}
      />
      <KpiCard
        label="Win rate"
        value={
          stats.wr === null ? (
            "—"
          ) : (
            <>
              <NumericValue value={stats.wr * 100} decimals={0} flash={false} />%
            </>
          )
        }
      />
      <KpiCard
        label="Avg win / loss"
        value={
          <span className="text-xs">
            <span className="text-profit">
              {stats.aw === null ? "—" : <NumericValue value={stats.aw} flash={false} />}
            </span>
            {" / "}
            <span className="text-loss">
              {stats.al === null ? "—" : <NumericValue value={stats.al} flash={false} />}
            </span>
          </span>
        }
      />
      <KpiCard label="Track record" value={stats.track === null ? "—" : `${stats.track}d`} />
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  accent?: "profit" | "loss";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
        {Icon && (
          <Icon
            className={`h-3.5 w-3.5 ${accent === "profit" ? "text-profit" : accent === "loss" ? "text-loss" : "text-muted-foreground"}`}
          />
        )}
      </div>
      <div
        className={`mt-1.5 font-mono text-lg font-semibold ${accent === "profit" ? "text-profit" : accent === "loss" ? "text-loss" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

/* ---------------- risk panel ---------------- */

function RiskPanel({
  stats,
}: {
  stats: { ddPct: number | null; pf: number | null; wr: number | null };
}) {
  const ddPct = stats.ddPct ?? 0;
  const riskLevel = ddPct < 10 ? "Low" : ddPct < 25 ? "Moderate" : "High";
  const riskColor =
    riskLevel === "Low"
      ? "text-risk-low border-risk-low/40 bg-risk-low/10"
      : riskLevel === "Moderate"
        ? "text-risk-mid border-risk-mid/40 bg-risk-mid/10"
        : "text-risk-high border-risk-high/40 bg-risk-high/10";

  return (
    <section className="flex flex-col justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Risk profile
        </div>
        <div
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${riskColor}`}
        >
          {riskLevel} drawdown risk
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Based on this master's worst historical peak-to-trough drop of{" "}
          <span className="font-mono text-foreground">{ddPct.toFixed(1)}%</span>. Past drawdowns
          don't cap future ones — size your allocation accordingly.
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border border-border bg-background/60 p-2">
          <div className="text-[9px] uppercase text-muted-foreground">Profit factor</div>
          <div className="mt-0.5 font-mono">
            {stats.pf === null ? "—" : stats.pf === Infinity ? "∞" : stats.pf.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md border border-border bg-background/60 p-2">
          <div className="text-[9px] uppercase text-muted-foreground">Win rate</div>
          <div className="mt-0.5 font-mono">
            {stats.wr === null ? "—" : `${Math.round(stats.wr * 100)}%`}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- equity chart ---------------- */

function EquitySection({
  curve,
  className,
}: {
  curve: { time: Date; equity: number }[];
  className?: string;
}) {
  if (curve.length < 2) return null;
  const data = curve.map((p) => ({
    t: p.time.getTime(),
    label: p.time.toISOString().slice(0, 10),
    equity: p.equity,
  }));
  const last = curve[curve.length - 1].equity;
  const first = curve[0].equity;
  const up = last >= first;
  const color = up ? "var(--profit)" : "var(--loss)";

  return (
    <section className={`rounded-lg border border-border bg-card p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Equity curve
        </div>
        <div className="font-mono text-xs">
          <NumericValue value={first} format="currency" flash={false} /> →{" "}
          <span className={up ? "text-profit" : "text-loss"}>
            <NumericValue value={last} format="currency" flash={false} />
          </span>
        </div>
      </div>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stroke={color}
              strokeWidth={2}
              fill="url(#equityFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ---------------- symbol breakdown ---------------- */

function SymbolBreakdown({ rows }: { rows: { symbol: string; trades: number; net: number }[] }) {
  if (rows.length === 0) return null;
  const top = rows.slice(0, 8);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Net P&amp;L by symbol
      </div>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="symbol"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v: number, _n, item) => [
                `$${v.toFixed(2)} · ${item.payload.trades} trades`,
                "Net",
              ]}
            />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {top.map((r) => (
                <Cell key={r.symbol} fill={r.net >= 0 ? "var(--profit)" : "var(--loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ---------------- hour heatmap ---------------- */

function HourHeatmap({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Trading hours (UTC)
      </div>
      <div className="mt-3 grid grid-cols-12 gap-1 sm:grid-cols-24">
        {bins.map((n, i) => (
          <div
            key={i}
            title={`${String(i).padStart(2, "0")}:00 — ${n} closes`}
            className="h-8 rounded-sm"
            style={{
              backgroundColor: "var(--primary)",
              opacity: (n / max) * 0.85 + 0.08,
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

/* ---------------- trade log ---------------- */

function RecentTrips({ trips }: { trips: import("@/lib/trades").RoundTrip[] }) {
  const [showAll, setShowAll] = useState(false);
  if (trips.length === 0) return null;
  const sorted = [...trips].sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime());
  const visible = showAll ? sorted.slice(0, 200) : sorted.slice(0, 12);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Trade log ({trips.length})
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" /> Followers see the same fills, in real time
        </div>
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
            {visible.map((t) => (
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
                <td className="px-3 py-2 text-right font-mono">{t.lots.toFixed(2)}</td>
                <td className={`px-3 py-2 text-right ${t.net >= 0 ? "text-profit" : "text-loss"}`}>
                  <NumericValue value={t.net} format="signed" flash={false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > 12 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          {showAll ? "Show less" : `Show more (${Math.min(sorted.length, 200) - 12} more)`}
        </button>
      )}
    </section>
  );
}