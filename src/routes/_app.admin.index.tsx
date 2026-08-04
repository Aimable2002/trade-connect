import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Banknote,
  Award,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  WEEKDAYS,
  adminMock,
  currency,
  useAdminMock,
  type AdminUser,
} from "@/lib/admin-mock";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";
import { AdminGate } from "@/components/AdminGate";

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
  const s = useAdminMock();

  const totals = useMemo(() => {
    const last = s.revenue[s.revenue.length - 1];
    const prev = s.revenue[s.revenue.length - 2];
    const mrr = last.infra + last.slots + last.profitShare;
    const prevMrr = prev.infra + prev.slots + prev.profitShare;
    const g = s.growth[s.growth.length - 1];
    return {
      mrr,
      mrrDelta: ((mrr - prevMrr) / prevMrr) * 100,
      annualised: mrr * 12,
      masters: g.masters,
      followers: g.followers,
      pendingPayouts: s.payouts.filter((p) => p.status === "pending"),
      atRisk: s.users.filter((u) => u.status === "debt" || u.status === "grace").length,
      totalTrades: s.heatmap.flat().reduce((a, b) => a + b, 0),
    };
  }, [s]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Platform
          </div>
          <h1 className="mt-1 truncate font-mono text-lg font-bold tracking-widest md:text-xl">
            ADMIN CONSOLE
          </h1>
        </div>
        <Link
          to="/admin/challenges"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <Award className="h-3.5 w-3.5" /> Challenges
        </Link>
      </header>

      <PlaceholderBanner text="Mock analytics — nothing here is wired to live platform data yet." />

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
          value={currency(totals.pendingPayouts.reduce((a, p) => a + p.amount, 0))}
          sub={`${totals.pendingPayouts.length} request(s)`}
          accent={totals.pendingPayouts.length ? "warning" : undefined}
        />
        <Kpi
          icon={ShieldAlert}
          label="At-risk wallets"
          value={String(totals.atRisk)}
          sub="In debt or grace"
          accent={totals.atRisk ? "loss" : undefined}
        />
      </section>

      <Panel title="Revenue by stream" hint={`Annualised run-rate ${currency(totals.annualised)}`}>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={s.revenue} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
              <Tooltip
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
                dataKey="profitShare"
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
              <BarChart data={s.growth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
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

        <Panel title="Traded symbols" hint="Volume across the platform">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={s.symbols}
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
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="volume" name="Lots" fill="var(--primary)" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Execution heatmap"
        hint={`${totals.totalTrades.toLocaleString()} fills · weekday × hour (UTC)`}
      >
        <Heatmap grid={s.heatmap} />
      </Panel>

      <PayoutQueue />

      <Panel title="Top masters by platform revenue">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left">Master</th>
                <th className="px-2 py-2 text-right">Followers</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Net P&amp;L</th>
                <th className="px-2 py-2 text-right">Max DD</th>
                <th className="px-2 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {s.topMasters.map((m) => (
                <tr key={m.accountId} className="border-b border-border last:border-0">
                  <td className="px-2 py-2">
                    <div className="font-medium">{m.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{m.accountId}</div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{m.followers}</td>
                  <td className="px-2 py-2 text-right font-mono">{m.ratePct}%</td>
                  <td
                    className={`px-2 py-2 text-right font-mono ${m.netPnl >= 0 ? "text-profit" : "text-loss"}`}
                  >
                    {currency(m.netPnl)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-loss">{m.drawdownPct}%</td>
                  <td className="px-2 py-2 text-right font-mono">{currency(m.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <UserManagement />

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
  children: React.ReactNode;
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

function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(...grid.flat(), 1);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[620px]">
        <div className="grid grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-0.5">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center font-mono text-[8px] text-muted-foreground">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
          {grid.map((row, d) => (
            <div key={d} className="contents">
              <div className="pr-1 text-right font-mono text-[9px] leading-5 text-muted-foreground">
                {WEEKDAYS[d]}
              </div>
              {row.map((v, h) => (
                <div
                  key={h}
                  title={`${WEEKDAYS[d]} ${h}:00 — ${v} fills`}
                  className="h-5 rounded-[2px]"
                  style={{
                    backgroundColor: `color-mix(in oklab, var(--primary) ${Math.round((v / max) * 100)}%, var(--muted))`,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PayoutQueue() {
  const { payouts } = useAdminMock();
  return (
    <Panel title="Payout requests" hint="Master withdrawals awaiting review">
      <div className="space-y-2">
        {payouts.map((p) => (
          <div
            key={p.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-border bg-background/60 p-3"
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{p.masterName}</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">
                {p.masterId} · {p.requestedAt}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-mono text-sm text-profit">{currency(p.amount)}</span>
              {p.status === "pending" ? (
                <button
                  onClick={() => adminMock.resolvePayout(p.id, "paid")}
                  className="rounded border border-profit/40 px-2.5 py-1.5 text-[11px] text-profit"
                >
                  Mark paid
                </button>
              ) : (
                <span className="rounded border border-profit/40 bg-profit/10 px-2 py-0.5 font-mono text-[10px] uppercase text-profit">
                  {p.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

const STATUS_STYLES: Record<AdminUser["status"], string> = {
  live: "border-profit/40 bg-profit/10 text-profit",
  paused: "border-border bg-muted/40 text-muted-foreground",
  grace: "border-warning/40 bg-warning/10 text-warning",
  debt: "border-loss/40 bg-loss/10 text-loss",
  closed: "border-border bg-muted/40 text-muted-foreground",
};

function UserManagement() {
  const { users } = useAdminMock();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "master" | "follower">("all");

  const filtered = users.filter(
    (u) =>
      (role === "all" || u.role === role) &&
      (q === "" ||
        u.email.toLowerCase().includes(q.toLowerCase()) ||
        u.accountId.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <Panel title="Users" hint={`${filtered.length} of ${users.length}`}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or account id"
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
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="px-2 py-2">
                  <div className="truncate">{u.email}</div>
                  <div className="truncate font-mono text-[10px] text-muted-foreground">
                    {u.accountId}
                  </div>
                </td>
                <td className="px-2 py-2 capitalize text-muted-foreground">{u.role}</td>
                <td className="px-2 py-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase ${STATUS_STYLES[u.status]}`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono">{currency(u.lifetimeValue)}</td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">{u.joined}</td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() =>
                      adminMock.setUserStatus(u.id, u.status === "closed" ? "live" : "closed")
                    }
                    className="rounded border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {u.status === "closed" ? "Restore" : "Suspend"}
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
