import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  accountTradesQueryOptions,
  mastersDirectoryQueryOptions,
  rosterQueryOptions,
  subscriptionsQueryOptions,
} from "@/lib/queries";
import type { AccountRow } from "@/lib/supabase";
import type { Deal } from "@/lib/api";
import {
  bySymbol,
  cumulativePnlCurve,
  equityCurve,
  maxDrawdownAbs,
  netPnl,
  profitFactor,
  winRate,
} from "@/lib/trades";
import { NumericValue } from "@/components/NumericValue";
import { PatientLoader, ErrorState } from "@/components/DataState";

const CHART_TOOLTIP = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export function DashboardPerformance({ accounts }: { accounts: AccountRow[] }) {
  const [selected, setSelected] = useState<string>("all");

  const results = useQueries({
    queries: accounts.map((a) => accountTradesQueryOptions(a.account_id)),
  });

  const isLoading = results.some((r) => r.isLoading);
  const firstError = results.find((r) => r.error)?.error as Error | undefined;

  const deals: Deal[] = useMemo(() => {
    const out: Deal[] = [];
    accounts.forEach((a, i) => {
      if (selected !== "all" && a.account_id !== selected) return;
      const d = results[i]?.data as Deal[] | undefined;
      if (d) out.push(...d);
    });
    return out;
  }, [accounts, results, selected]);

  const stats = useMemo(() => {
    if (deals.length === 0) return null;
    return {
      pnl: netPnl(deals),
      dd: maxDrawdownAbs(deals),
      pf: profitFactor(deals),
      wr: winRate(deals, 365 * 10),
      equity: equityCurve(deals),
      cum: cumulativePnlCurve(deals),
      symbols: bySymbol(deals).slice(0, 6),
    };
  }, [deals]);

  const followers = accounts.filter((a) => a.role === "follower");

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Performance
          </div>
          {accounts.length > 1 && (
            <div className="flex flex-wrap gap-1">
              <ScopeButton
                active={selected === "all"}
                onClick={() => setSelected("all")}
                label="All accounts"
              />
              {accounts.map((a) => (
                <ScopeButton
                  key={a.account_id}
                  active={selected === a.account_id}
                  onClick={() => setSelected(a.account_id)}
                  label={a.account_id}
                />
              ))}
            </div>
          )}
        </div>

        {isLoading && <PatientLoader label="Pulling deals from MT5…" compact className="mt-2" />}
        {!isLoading && firstError && (
          <ErrorState className="mt-2" message={firstError.message} />
        )}
        {!isLoading && !firstError && (!stats || stats.cum.length < 2) && (
          <div className="mt-2 text-xs text-muted-foreground">
            Not enough closed trades yet to chart performance.
          </div>
        )}

        {stats && stats.cum.length >= 2 && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniKpi
                label="Net P&L"
                accent={stats.pnl >= 0 ? "profit" : "loss"}
                icon={stats.pnl >= 0 ? TrendingUp : TrendingDown}
                value={<NumericValue value={stats.pnl} format="signed" flash={false} />}
              />
              <MiniKpi
                label="Max DD"
                value={<NumericValue value={stats.dd} format="currency" flash={false} />}
              />
              <MiniKpi
                label="Profit factor"
                value={stats.pf === null ? "—" : stats.pf === Infinity ? "∞" : stats.pf.toFixed(2)}
              />
              <MiniKpi
                label="Win rate"
                value={stats.wr === null ? "—" : `${Math.round(stats.wr * 100)}`}
                suffix={stats.wr === null ? undefined : "%"}
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Equity curve
                </div>
                <div className="mt-2 h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stats.equity.map((p) => ({
                        label: p.time.toISOString().slice(0, 10),
                        equity: p.equity,
                      }))}
                      margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="dashEquityFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                        minTickGap={40}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                        tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP}
                        labelStyle={{ color: "var(--muted-foreground)" }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, "Equity"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        fill="url(#dashEquityFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Net by symbol
                </div>
                <div className="mt-2 h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.symbols} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="symbol"
                        tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        tickFormatter={(v: number) => `$${Math.round(v)}`}
                      />
                      <Tooltip
                        contentStyle={CHART_TOOLTIP}
                        labelStyle={{ color: "var(--muted-foreground)" }}
                        formatter={(v: number) => [`$${v.toFixed(2)}`, "Net"]}
                      />
                      <Bar dataKey="net" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Cumulative net P&L
              </div>
              <div className="mt-2 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={stats.cum.map((p) => ({
                      label: p.time.toISOString().slice(0, 10),
                      pnl: p.equity,
                    }))}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dashPnlFill" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={stats.pnl >= 0 ? "var(--profit)" : "var(--loss)"}
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor={stats.pnl >= 0 ? "var(--profit)" : "var(--loss)"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={{ stroke: "var(--border)" }}
                      minTickGap={40}
                    />
                    <YAxis
                      tick={{ fontSize: 9, fill: "var(--muted-foreground)" }}
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tickFormatter={(v: number) => `$${Math.round(v).toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Cumulative P&L"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="pnl"
                      stroke={stats.pnl >= 0 ? "var(--profit)" : "var(--loss)"}
                      strokeWidth={2}
                      fill="url(#dashPnlFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>

      {followers.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Copying
          </div>
          <div className="mt-3 space-y-2">
            {followers.map((f) => (
              <CopyingRow key={f.account_id} accountId={f.account_id} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CopyingRow({ accountId }: { accountId: string }) {
  const { data: roster } = useQuery(rosterQueryOptions(accountId));
  const { data: subs } = useQuery(subscriptionsQueryOptions());
  const { data: directory } = useQuery(mastersDirectoryQueryOptions());

  const current = (roster?.roster ?? []).find((r) => r.is_current);
  const sub = (subs ?? []).find((s) => s.follower_account_id === accountId && s.active);
  const masterId = current?.master_account_id ?? sub?.master_account_id ?? null;
  const master = (directory ?? []).find((m) => m.account_id === masterId);
  const since = current?.first_used_at
    ? new Date(current.first_used_at).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/60 p-2">
      <div className="min-w-0">
        <div className="truncate font-mono text-[10px] text-muted-foreground">{accountId}</div>
        {masterId ? (
          <div className="mt-0.5 flex items-center gap-1.5 text-sm">
            <Users className="h-3 w-3 text-primary" />
            <Link
              to="/insight/$accountId"
              params={{ accountId: masterId }}
              className="truncate text-primary hover:underline"
            >
              {master?.display_name ?? masterId}
            </Link>
          </div>
        ) : (
          <div className="mt-0.5 text-xs text-muted-foreground">Not copying any master yet.</div>
        )}
      </div>
      <div className="text-right">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Since</div>
        <div className="font-mono text-xs">{since ?? "—"}</div>
      </div>
    </div>
  );
}

function ScopeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded border px-2 py-1 font-mono text-[10px] ${
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function MiniKpi({
  label,
  value,
  suffix,
  accent,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  accent?: "profit" | "loss";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border border-border bg-background/60 p-2">
      <div className="flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
        {Icon && (
          <Icon
            className={`h-3 w-3 ${accent === "profit" ? "text-profit" : accent === "loss" ? "text-loss" : "text-muted-foreground"}`}
          />
        )}
      </div>
      <div
        className={`mt-1 font-mono text-sm font-semibold ${accent === "profit" ? "text-profit" : accent === "loss" ? "text-loss" : ""}`}
      >
        {value}
        {suffix}
      </div>
    </div>
  );
}
