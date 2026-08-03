import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ChallengeStatusPanel } from "@/components/challenges/ChallengeStatusPanel";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell as RCell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  Banknote,
  EyeOff,
  Globe,
  Loader2,
  Pause,
  Play,
  Power,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";

import {
  accountTradesQueryOptions,
  accountsQueryOptions,
  billingQueryOptions,
  masterEarningsQueryOptions,
  masterProfileQueryOptions,
  masterRateQueryOptions,
  mastersDirectoryQueryOptions,
  rosterQueryOptions,
  walletQueryOptions,
  walletTxQueryOptions,
} from "@/lib/queries";
import {
  ApiError,
  closeAccount,
  pauseAccount,
  PLATFORM_FEE_OF_MASTER_CUT_PCT,
  reactivateBilling,
  resumeAccount,
  setMasterRate,
  switchMaster,
  upsertMasterProfile,
} from "@/lib/api";
import { NumericValue } from "@/components/NumericValue";
import { RoleBadge } from "@/components/RoleBadge";
import { StatusPill } from "@/components/StatusPill";
import { Modal } from "@/components/Modal";
import { PatientLoader, ErrorState } from "@/components/DataState";
import {
  bySymbol,
  equityCurve,
  maxDrawdownAbs,
  maxDrawdownPct,
  pairDeals,
  profitFactor,
  netPnl,
  winRate,
} from "@/lib/trades";

export const Route = createFileRoute("/_app/accounts/$accountId")({
  component: AccountDetails,
});

function AccountDetails() {
  const { accountId } = Route.useParams();
  const { data: accounts, isLoading, error } = useQuery(accountsQueryOptions());
  const account = (accounts ?? []).find((a) => a.account_id === accountId);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <PatientLoader label="Loading account…" />
      </div>
    );
  }
  if (error && !account) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground">
          ← Back
        </Link>
        <ErrorState className="mt-4" message={(error as Error).message} />
      </div>
    );
  }
  if (!account) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Link to="/dashboard" className="text-xs text-muted-foreground">
          ← Back
        </Link>
        <div className="mt-4 rounded-lg border border-loss/30 bg-loss/5 p-4 text-sm text-loss">
          Account not found or you don't own it.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to dashboard
      </Link>

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <RoleBadge role={account.role} />
            <StatusPill status={account.status} />
          </div>
          <h1 className="mt-2 truncate text-xl font-semibold">Account details</h1>
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {account.account_id}
          </div>
        </div>
      </header>

      <LifecycleControls accountId={accountId} status={account.status} />

      {account.role === "master" ? (
        <MasterSections accountId={accountId} />
      ) : (
        <FollowerSections accountId={accountId} />
      )}

      <TradesSection accountId={accountId} />
    </div>
  );
}

/* ---------------- lifecycle ---------------- */

function LifecycleControls({ accountId, status }: { accountId: string; status: string }) {
  const qc = useQueryClient();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };

  const pause = useMutation({
    mutationFn: (force_close: boolean) => pauseAccount(accountId, force_close),
    onSuccess: (r) => {
      toast.success(`Paused${r.closed_fills ? ` — closed ${r.closed_fills} fill(s)` : ""}.`);
      setPauseOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const resume = useMutation({
    mutationFn: () => resumeAccount(accountId),
    onSuccess: () => {
      toast.success("Resumed.");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const closeM = useMutation({
    mutationFn: () => closeAccount(accountId),
    onSuccess: () => {
      toast.success("Closed.");
      setCloseOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <section className="flex flex-wrap gap-2">
      <button
        onClick={() => setPauseOpen(true)}
        disabled={status === "paused" || status === "closed"}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-warning/60 disabled:opacity-40"
      >
        <Pause className="h-3.5 w-3.5" /> Pause
      </button>
      <button
        onClick={() => resume.mutate()}
        disabled={resume.isPending || status === "live" || status === "closed"}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-profit/60 disabled:opacity-40"
      >
        <Play className="h-3.5 w-3.5" /> Resume
      </button>
      <button
        onClick={() => setCloseOpen(true)}
        disabled={status === "closed"}
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-loss hover:border-loss/60 disabled:opacity-40"
      >
        <Power className="h-3.5 w-3.5" /> Close
      </button>

      <Modal open={pauseOpen} onClose={() => setPauseOpen(false)} title="Pause account">
        <p className="text-xs text-muted-foreground">
          Stop new copy fills. You can also force-close any currently open positions on this
          account.
        </p>
        <div className="mt-4 grid gap-2">
          <button
            disabled={pause.isPending}
            onClick={() => pause.mutate(false)}
            className="rounded-md border border-border px-3 py-2 text-left text-xs hover:border-primary/60"
          >
            Pause only — leave open positions running
          </button>
          <button
            disabled={pause.isPending}
            onClick={() => pause.mutate(true)}
            className="rounded-md border border-loss/40 bg-loss/10 px-3 py-2 text-left text-xs text-loss hover:bg-loss/20"
          >
            Pause + force-close all open positions
          </button>
        </div>
      </Modal>

      <Modal open={closeOpen} onClose={() => setCloseOpen(false)} title="Close account?">
        <p className="text-xs text-muted-foreground">
          This tears down the MT5 instance. You'll need to re-provision to use this account again.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setCloseOpen(false)}
            className="rounded border border-border px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            disabled={closeM.isPending}
            onClick={() => closeM.mutate()}
            className="rounded bg-loss px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {closeM.isPending ? "Closing…" : "Close account"}
          </button>
        </div>
      </Modal>
    </section>
  );
}

/* ---------------- master ---------------- */

function MasterSections({ accountId }: { accountId: string }) {
  return (
    <>
      <MasterPerformancePanel accountId={accountId} />
      <MasterProfileEditor accountId={accountId} />
      <MasterEarningsPanel accountId={accountId} />
      <MasterPayoutCard accountId={accountId} />

      <ChallengeStatusPanel />
    </>
  );
}

function MasterPerformancePanel({ accountId }: { accountId: string }) {
  const { data: deals, isLoading, error, refetch } = useQuery(accountTradesQueryOptions(accountId));

  const stats = useMemo(() => {
    if (!deals) return null;
    return {
      pnl: netPnl(deals),
      dd: maxDrawdownAbs(deals),
      ddPct: maxDrawdownPct(deals),
      pf: profitFactor(deals),
      wr: winRate(deals, 365 * 10),
      curve: equityCurve(deals),
      symbols: bySymbol(deals).slice(0, 6),
    };
  }, [deals]);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Performance</div>
      {isLoading && <PatientLoader label="Pulling deals from MT5…" compact className="mt-2" />}
      {error && (
        <ErrorState className="mt-2" message={(error as Error).message} onRetry={() => refetch()} />
      )}
      {stats && stats.curve.length < 2 && !isLoading && !error && (
        <div className="mt-2 text-xs text-muted-foreground">
          Not enough closed trades yet to chart performance.
        </div>
      )}
      {stats && stats.curve.length >= 2 && (
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
              sub={stats.ddPct !== null ? `${stats.ddPct.toFixed(1)}%` : undefined}
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
                    data={stats.curve.map((p) => ({
                      label: p.time.toISOString().slice(0, 10),
                      equity: p.equity,
                    }))}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="masterEquityFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
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
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#masterEquityFill)"
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
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
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
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "var(--muted-foreground)" }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Net"]}
                    />
                    <Bar dataKey="net" radius={[3, 3, 0, 0]}>
                      {stats.symbols.map((r) => (
                        <RCell key={r.symbol} fill={r.net >= 0 ? "var(--profit)" : "var(--loss)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MiniKpi({
  label,
  value,
  suffix,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  suffix?: string;
  sub?: string;
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
        {sub && <span className="ml-1 text-[10px] font-normal text-muted-foreground">({sub})</span>}
      </div>
    </div>
  );
}

function MasterProfileEditor({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  // This account's OWN profile, regardless of public/private - NOT the
  // public directory (mastersDirectoryQueryOptions), which only ever
  // returns already-public masters and so can never reflect a private
  // profile's real saved data, or distinguish "private with real data"
  // from "never saved anything" (both looked identical - blank - before
  // this fix, since both were simply absent from the directory list).
  const { data: profile, isLoading } = useQuery(masterProfileQueryOptions(accountId));

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  // Read-only: listing is granted by the platform, never set here.
  const isPublic = profile?.is_public ?? false;

  // useState's initializer only runs once, at mount - it can't react to
  // `profile` arriving later from the query above, which is the normal
  // case (the query is still loading on first render). Without this
  // effect, the fields would stay permanently blank even after
  // real data loads, which was the actual bug: it wasn't that the data
  // wasn't fetched, it's that fetching it after mount had nowhere to go.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () =>
      upsertMasterProfile(accountId, {
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success("Profile saved.");
      qc.invalidateQueries({ queryKey: ["masters", "directory"] });
      qc.invalidateQueries({ queryKey: ["masters", accountId, "profile"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Public profile
        </div>
        <PatientLoader label="Loading profile…" compact className="mt-2" />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Public profile
      </div>
      <form
        className="mt-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!displayName.trim()) {
            toast.error("Display name is required.");
            return;
          }
          save.mutate();
        }}
      >
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Not set yet"
            className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Bio">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Not set yet"
            className="w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </Field>
        {/* Directory listing is decided by the platform, not the master, so
            this is a status readout rather than a control. The saved value is
            still round-tripped through `isPublic` above. */}
        <div
          className={`flex items-start gap-2.5 rounded-md border p-3 ${
            isPublic
              ? "border-profit/30 bg-profit/5"
              : "border-warning/30 bg-warning/5"
          }`}
        >
          {isPublic ? (
            <Globe className="mt-0.5 h-4 w-4 shrink-0 text-profit" />
          ) : (
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          )}
          <div className="min-w-0">
            <div
              className={`text-xs font-semibold ${isPublic ? "text-profit" : "text-warning"}`}
            >
              {isPublic ? "Listed in the public directory" : "Not listed yet"}
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
              {isPublic
                ? "Followers can find this profile in the directory and leaderboard. Your live stats are computed from your real MT5 deals."
                : "Listing is granted by CopyDesk once you pass Challenge 1 and your track record is verified — it isn't a switch you flip yourself. Keep your profile up to date in the meantime."}
            </p>
          </div>
        </div>

        <button
          disabled={save.isPending}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </form>
    </section>
  );
}


function MasterEarningsPanel({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useQuery(masterEarningsQueryOptions(accountId));
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Earnings</div>
      {isLoading && <PatientLoader label="Loading…" compact className="mt-2" />}
      {error && <ErrorState message={(error as Error).message} className="mt-2" />}
      {data && (
        <>
          <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
            <Info
              label="Total earned"
              value={<NumericValue value={data.total_earned} format="currency" flash={false} />}
              accent
            />
            <Info label="Transactions" value={data.transaction_count} />
          </div>
          {data.recent.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[420px] text-xs">
                <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left">When</th>
                    <th className="px-2 py-1 text-left">Follower</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1 font-mono">
                        {r.created_at?.slice(0, 16).replace("T", " ")}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {r.related_follower_account_id?.slice(0, 12) ?? "—"}
                      </td>
                      <td
                        className={`px-2 py-1 text-right font-mono ${r.amount >= 0 ? "text-profit" : "text-loss"}`}
                      >
                        <NumericValue value={r.amount} format="signed" flash={false} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/**
 * Payout requests aren't wired to a backend route yet — this card is the
 * agreed UI surface for the master's withdrawable balance, and the request
 * action is intentionally a stub until the endpoint exists.
 */
const PAYOUT_MINIMUM = 50;

function MasterPayoutCard({ accountId }: { accountId: string }) {
  const { data, isLoading } = useQuery(masterEarningsQueryOptions(accountId));
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const available = data?.total_earned ?? 0;
  const canRequest = available >= PAYOUT_MINIMUM;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Banknote className="h-3 w-3" /> Payouts
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Earned balance
          </div>
          <div className="mt-1 text-3xl font-semibold">
            {isLoading ? (
              <span className="text-muted-foreground/60">…</span>
            ) : (
              <NumericValue value={available} format="currency" flash={false} />
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Profit share credited from your followers. Minimum payout $
            {PAYOUT_MINIMUM}.
          </p>
        </div>
        <button
          onClick={() => {
            setAmount(available.toFixed(2));
            setOpen(true);
          }}
          disabled={!canRequest}
          className="shrink-0 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          Request payout
        </button>
      </div>

      {!isLoading && !canRequest && (
        <div className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          You need at least{" "}
          <NumericValue value={PAYOUT_MINIMUM} format="currency" flash={false} /> in earnings before
          a payout can be requested.
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Request a payout">
        <p className="text-xs text-muted-foreground">
          Withdraw your credited profit share. Requests are reviewed by CopyDesk before funds are
          released.
        </p>
        <label className="mt-4 block">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Amount</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setOpen(false);
              toast.info("Payout requests aren't live yet — this is a preview of the flow.");
            }}
            className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Submit request
          </button>
        </div>
      </Modal>
    </section>
  );
}

/* ---------------- follower ---------------- */


function FollowerSections({ accountId }: { accountId: string }) {
  return (
    <>
      <WalletPanel accountId={accountId} />
      <BillingPanel accountId={accountId} />
      <RosterPanel accountId={accountId} />
      <SpendHistory accountId={accountId} />
    </>
  );
}

function WalletPanel({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useQuery(walletQueryOptions(accountId));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <WalletIcon className="h-3 w-3" /> Wallet
      </div>
      {isLoading && <PatientLoader label="Loading…" compact className="mt-2" />}
      {error && <ErrorState message={(error as Error).message} className="mt-2" />}
      {data && !data.exists && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            This account has no wallet yet. Pick a package to start.
          </p>
          <Link
            to="/pricing"
            search={{ account: accountId }}
            className="inline-flex w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Choose a package
          </Link>
        </div>
      )}
      {data && data.exists && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <div className="text-3xl font-semibold">
            <NumericValue value={data.balance} format="currency" />
          </div>
          <div className="flex flex-wrap gap-2">
            {data.in_debt && (
              <span className="rounded border border-loss/40 bg-loss/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-loss">
                Wallet negative
              </span>
            )}
            <Link
              to="/pricing"
              search={{ account: accountId }}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              Top up
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

function BillingPanel({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(billingQueryOptions(accountId));

  const reactivate = useMutation({
    mutationFn: (code: string) => reactivateBilling(accountId, code),
    onSuccess: () => {
      toast.success(
        "Billing reactivated. If trading was closed, re-provision the account (step 2 of 2).",
      );
      qc.invalidateQueries({ queryKey: ["accounts", accountId, "billing"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Subscription
      </div>
      {isLoading && <PatientLoader label="Loading…" compact className="mt-2" />}
      {error && <ErrorState message={(error as Error).message} className="mt-2" />}
      {data && data.status === "none" && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">No active subscription.</p>
          <Link
            to="/pricing"
            search={{ account: accountId }}
            className="inline-flex w-fit rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            Select a package
          </Link>
        </div>
      )}
      {data &&
        data.status !== "none" &&
        (() => {
          const bp = data as Exclude<typeof data, { status: "none" }>;
          return (
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Package" value={bp.package_code} />
                <Info
                  label="Status"
                  value={
                    <span
                      className={
                        bp.status === "active"
                          ? "text-profit"
                          : bp.status === "grace"
                            ? "text-warning"
                            : "text-loss"
                      }
                    >
                      {bp.status}
                    </span>
                  }
                />
                {bp.renews_at && (
                  <Info label="Renews" value={new Date(bp.renews_at).toLocaleString()} />
                )}
                {bp.grace_started_at && (
                  <Info
                    label="Grace since"
                    value={new Date(bp.grace_started_at).toLocaleString()}
                  />
                )}
              </div>
              {bp.status === "grace" && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-2 text-[11px] text-warning">
                  Subscription is in grace. Top up your wallet to allow renewal.
                </div>
              )}
              {bp.status === "closed" && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => reactivate.mutate(bp.package_code)}
                    disabled={reactivate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {reactivate.isPending ? "Reactivating…" : "Reactivate billing (step 1 of 2)"}
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    Trading needs a separate re-provision after this.
                  </span>
                </div>
              )}
            </div>
          );
        })()}
    </section>
  );
}

function RosterPanel({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(rosterQueryOptions(accountId));
  const { data: directory } = useQuery(mastersDirectoryQueryOptions());
  const [pick, setPick] = useState("");

  const swap = useMutation({
    mutationFn: (m: string) => switchMaster(accountId, m),
    onSuccess: (r) => {
      toast.success(r.charged ? "Switched — new slot charged." : "Switched (no charge).");
      setPick("");
      qc.invalidateQueries({ queryKey: ["accounts", accountId, "roster"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Master roster
      </div>
      {isLoading && <PatientLoader label="Loading…" compact className="mt-2" />}
      {error && <ErrorState message={(error as Error).message} className="mt-2" />}
      {data && (
        <>
          <div className="mt-3 space-y-1">
            {data.roster.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No masters in this billing period yet.
              </div>
            )}
            {data.roster.map((r) => (
              <div
                key={r.master_account_id}
                className="flex items-center justify-between rounded border border-border bg-background px-2 py-1.5 text-xs"
              >
                <span className="truncate font-mono">{r.master_account_id}</span>
                {r.is_current && (
                  <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pick) return;
              swap.mutate(pick);
            }}
          >
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Switch to master…</option>
              {(directory ?? []).map((m) => (
                <option key={m.account_id} value={m.account_id}>
                  {m.display_name} · {m.account_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <button
              disabled={!pick || swap.isPending}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              {swap.isPending ? "Switching…" : "Switch"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function SpendHistory({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useQuery(walletTxQueryOptions(accountId));

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Spend history
      </div>
      {isLoading && <PatientLoader label="Loading…" compact className="mt-2" />}
      {error && <ErrorState message={(error as Error).message} className="mt-2" />}
      {data && data.length === 0 && (
        <div className="mt-2 text-xs text-muted-foreground">No transactions yet.</div>
      )}
      {data && data.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[480px] text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left">When</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Master</th>
                <th className="px-2 py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1 font-mono">
                    {t.created_at?.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-2 py-1">{t.type}</td>
                  <td className="px-2 py-1 font-mono">
                    {t.related_master_account_id?.slice(0, 12) ?? "—"}
                  </td>
                  <td
                    className={`px-2 py-1 text-right font-mono ${t.amount >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    <NumericValue value={t.amount} format="signed" flash={false} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- trades ---------------- */

function TradesSection({ accountId }: { accountId: string }) {
  const {
    data: deals,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery(accountTradesQueryOptions(accountId));

  const trips = useMemo(() => {
    if (!deals) return [];
    return pairDeals(deals).trips.sort((a, b) => b.closeTime.getTime() - a.closeTime.getTime());
  }, [deals]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Trade history
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] disabled:opacity-40"
        >
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          Refresh
        </button>
      </div>
      {isLoading && (
        <PatientLoader
          label="Pulling deals from MT5…"
          slowLabel="The MT5 terminal is taking longer than usual to respond. This can happen when the terminal is busy — hang tight, it'll come through."
        />
      )}
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {deals && trips.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
          No closed round-trips yet.
        </div>
      )}
      {trips.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Closed</th>
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Side</th>
                <th className="px-3 py-2 text-right">Lots</th>
                <th className="px-3 py-2 text-right">P&amp;L</th>
                <th className="px-3 py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {trips.slice(0, 50).map((t) => (
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
      )}
    </section>
  );
}

/* ---------------- shared ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </label>
  );
}

function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded border border-border bg-background/60 p-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={accent ? "mt-1 font-mono text-sm text-primary" : "mt-1 font-mono text-sm"}>
        {value}
      </div>
    </div>
  );
}