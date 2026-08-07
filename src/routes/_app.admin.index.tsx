import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Banknote, Award, ShieldAlert, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import {
  approveAdminPayout,
  rejectAdminPayout,
  type AdminPayout,
  type AdminUserRow,
} from "@/lib/api";
import {
  adminGrowthQueryOptions,
  adminPayoutsQueryOptions,
  adminRevenueQueryOptions,
  adminSummaryQueryOptions,
  adminSymbolExposureQueryOptions,
  adminTopMastersQueryOptions,
  adminUsersQueryOptions,
} from "@/lib/queries";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, PatientLoader } from "@/components/DataState";
import { Modal } from "@/components/Modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { currency } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({
    meta: [
      { title: "Platform Admin — CopyDesk" },
      {
        name: "description",
        content:
          "CopyDesk platform admin: revenue, growth, payout queue, master performance and user management.",
      },
      { property: "og:title", content: "Platform Admin — CopyDesk" },
      {
        property: "og:description",
        content: "Revenue, growth, payouts and user management for CopyDesk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  return (
    <AdminGate>
      <AdminDashboardContent />
    </AdminGate>
  );
}

function AdminDashboardContent() {
  const qc = useQueryClient();
  const { data: summary, isLoading: summaryLoading, error: summaryError, refetch: refetchSummary } = useQuery(adminSummaryQueryOptions());
  const { data: revenue = [] } = useQuery(adminRevenueQueryOptions());
  const { data: growth = [] } = useQuery(adminGrowthQueryOptions());
  const { data: symbolExposure = [] } = useQuery(adminSymbolExposureQueryOptions());
  const { data: payouts = [] } = useQuery(adminPayoutsQueryOptions());
  const { data: topMasters = [] } = useQuery(adminTopMastersQueryOptions());
  const { data: users = [] } = useQuery(adminUsersQueryOptions());

  const totals = useMemo(() => ({
    mrr: summary?.mrr ?? 0,
    mrrDelta: summary?.mrr_change_pct ?? 0,
    annualised: (summary?.mrr ?? 0) * 12,
    masters: summary?.masters_count ?? 0,
    followers: summary?.followers_count ?? 0,
    pendingAmount: summary?.payouts_pending_amount ?? 0,
    pendingCount: summary?.payouts_pending_count ?? 0,
    atRisk: summary?.at_risk_wallets_count ?? 0,
  }), [summary]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  if (summaryLoading && !summary) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <PatientLoader label="Loading admin analytics…" />
      </div>
    );
  }

  if (summaryError && !summary) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <ErrorState message={(summaryError as Error).message} onRetry={() => refetchSummary()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</div>
          <h1 className="mt-1 truncate font-mono text-lg font-bold tracking-widest md:text-xl">
            ADMIN CONSOLE
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/admin/masters"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Users className="h-3.5 w-3.5" /> Masters
          </Link>
          <Link
            to="/admin/challenges"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Award className="h-3.5 w-3.5" /> Challenges
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={TrendingUp}
          label="MRR"
          value={currency(totals.mrr)}
          sub={`${totals.mrrDelta >= 0 ? "+" : ""}${totals.mrrDelta.toFixed(1)}% vs last month`}
          accent={totals.mrrDelta >= 0 ? "profit" : "loss"}
        />
        <Kpi
          icon={Users}
          label="Accounts"
          value={`${totals.masters + totals.followers}`}
          sub={`${totals.masters} masters · ${totals.followers} followers`}
        />
        <Kpi
          icon={Banknote}
          label="Payouts pending"
          value={currency(totals.pendingAmount)}
          sub={`${totals.pendingCount} request(s)`}
          accent={totals.pendingCount ? "warning" : undefined}
        />
        <Kpi
          icon={ShieldAlert}
          label="At-risk wallets"
          value={String(totals.atRisk)}
          sub="Live risk signals"
          accent={totals.atRisk ? "loss" : undefined}
        />
      </section>

      <Panel title="Revenue by stream" hint={`Annualised run-rate ${currency(totals.annualised)}`}>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gInfra" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSlots" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--profit)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--profit)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--warning)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--warning)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <RechartsTooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="infra"
                name="Infra fees"
                stroke="var(--primary)"
                fill="url(#gInfra)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="slots"
                name="Slot fees"
                stroke="var(--profit)"
                fill="url(#gSlots)"
                stackId="1"
              />
              <Area
                type="monotone"
                dataKey="profit_share"
                name="Profit share"
                stroke="var(--warning)"
                fill="url(#gPs)"
                stackId="1"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Account growth">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="masters" name="Masters" fill="var(--primary)" radius={[2, 2, 0, 0]} />
                <Bar
                  dataKey="followers"
                  name="Followers"
                  fill="var(--profit)"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Current symbol exposure" hint="Live open positions, platform-wide">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={symbolExposure}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 12, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  width={62}
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="lots" name="Lots" fill="var(--primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <PayoutQueue payouts={payouts} invalidate={invalidate} />

      <Panel title="Top masters by platform revenue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left">Master</th>
                <th className="px-2 py-2 text-right">Followers</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Billed P&amp;L</th>
                <th className="px-2 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topMasters.map((m) => (
                <tr key={m.account_id} className="border-b border-border last:border-0">
                  <td className="px-2 py-2">
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{m.account_id}</div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{m.followers}</td>
                  <td className="px-2 py-2 text-right font-mono">{m.rate_percent === null ? "—" : `${m.rate_percent}%`}</td>
                  <td className={`px-2 py-2 text-right font-mono ${m.billed_pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    {currency(m.billed_pnl)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{currency(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">Realized profit on already profit-share-billed trades only — does not include unbilled losses.</span>
              </TooltipTrigger>
              <TooltipContent>Accounts only post billed P&amp;L once profit-share has been settled.</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Panel>

      <UserManagement users={users} />
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub: string;
  accent?: "profit" | "loss" | "warning";
}) {
  const color =
    accent === "profit"
      ? "text-profit"
      : accent === "loss"
        ? "text-loss"
        : accent === "warning"
          ? "text-warning"
          : "";
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <Icon className={`h-3.5 w-3.5 ${color || "text-muted-foreground"}`} />
      </div>
      <div className={`mt-1.5 font-mono text-lg font-semibold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <div className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">
          {title}
        </div>
        {hint && <div className="shrink-0 text-[10px] text-muted-foreground/70">{hint}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PayoutQueue({
  payouts,
  invalidate,
}: {
  payouts: AdminPayout[];
  invalidate: () => void;
}) {
  const qc = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const approve = useMutation({
    mutationFn: (id: string) => approveAdminPayout(id),
    onSuccess: () => {
      toast.success("Payout approved.");
      qc.invalidateQueries({ queryKey: ["admin"] });
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectAdminPayout(id, reason),
    onSuccess: () => {
      toast.success("Payout rejected.");
      setRejectOpen(false);
      setRejectReason("");
      setActiveId(null);
      qc.invalidateQueries({ queryKey: ["admin"] });
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Panel title="Payout requests" hint="Master withdrawals awaiting review">
      <div className="space-y-2">
        {payouts.map((p) => (
          <div
            key={p.id}
            className="rounded-md border border-border bg-background/60 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-medium">
                  {p.master_profiles?.display_name || "Unnamed master"}
                </div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {p.master_account_id} · {p.period_end}
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
                  <span>Recipient: {p.recipient_name || "—"}</span>
                  <span>{p.recipient_phone || "—"}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-profit">{currency(p.amount)}</span>
                <button
                  disabled={approve.isPending}
                  onClick={() => approve.mutate(p.id)}
                  className="rounded border border-profit/40 px-2.5 py-1.5 text-[11px] text-profit disabled:opacity-40"
                >
                  Approve
                </button>
                <button
                  disabled={reject.isPending}
                  onClick={() => {
                    setActiveId(p.id);
                    setRejectReason("");
                    setRejectOpen(true);
                  }}
                  className="rounded border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground disabled:opacity-40"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject payout">
        <p className="text-xs text-muted-foreground">Add a short reason so the master knows why the request was declined.</p>
        <label className="mt-3 block">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Reason</span>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setRejectOpen(false)}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            Cancel
          </button>
          <button
            disabled={!rejectReason.trim() || !activeId || reject.isPending}
            onClick={() => {
              if (!activeId) return;
              reject.mutate({ id: activeId, reason: rejectReason.trim() });
            }}
            className="rounded bg-loss px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Reject payout
          </button>
        </div>
      </Modal>
    </Panel>
  );
}

function UserManagement({ users }: { users: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "master" | "follower">("all");

  const filtered = users.filter(
    (u) =>
      (role === "all" || u.role === role) &&
      (q === "" || u.account_id.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Panel title="Users" hint={`${filtered.length} of ${users.length}`}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account id"
          className="min-w-0 rounded-md border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
        />
        <div className="flex gap-1">
          {(["all", "master", "follower"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-md border px-3 py-2 text-[11px] capitalize ${
                role === r
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left">User</th>
              <th className="px-2 py-2 text-left">Role</th>
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-right">LTV</th>
              <th className="px-2 py-2 text-right">Joined</th>
              <th className="px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.account_id} className="border-b border-border last:border-0">
                <td className="px-2 py-2">
                  <div className="truncate font-mono text-[10px] text-muted-foreground">{u.account_id}</div>
                </td>
                <td className="px-2 py-2 capitalize text-muted-foreground">{u.role}</td>
                <td className="px-2 py-2">
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${getStatusStyle(u.status)}`}>
                    {u.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono">{currency(u.lifetime_value)}</td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">{u.joined}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    disabled
                    title="Not available yet"
                    className="rounded border border-border px-2.5 py-1 text-[11px] text-muted-foreground opacity-60"
                  >
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function getStatusStyle(status: string): string {
  switch (status) {
    case "live":
      return "border-profit/40 bg-profit/10 text-profit";
    case "paused":
      return "border-border bg-muted/40 text-muted-foreground";
    case "grace":
      return "border-warning/40 bg-warning/10 text-warning";
    case "debt":
      return "border-loss/40 bg-loss/10 text-loss";
    case "closed":
      return "border-border bg-muted/40 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
}
