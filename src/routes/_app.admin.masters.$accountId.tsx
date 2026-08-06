import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { setAdminMasterPublic, type AdminMasterDetail, type AdminMasterListItem } from "@/lib/api";
import { adminMasterQueryOptions } from "@/lib/queries";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, PatientLoader } from "@/components/DataState";
import { NumericValue } from "@/components/NumericValue";
import { TradesTable } from "@/components/TradesTable";
import { PublicToggle, VisibilityBadge } from "@/components/admin/MasterVisibility";

export const Route = createFileRoute("/_app/admin/masters/$accountId")({
  head: () => ({
    meta: [
      { title: "Master detail — CopyDesk Admin" },
      {
        name: "description",
        content:
          "Admin view of a single CopyDesk master: profile, rate, earnings, followers and trade history.",
      },
      { property: "og:title", content: "Master detail — CopyDesk Admin" },
      {
        property: "og:description",
        content: "Profile, rate, earnings and trades for one master.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminMasterDetailPage,
});

function AdminMasterDetailPage() {
  return (
    <AdminGate>
      <Content />
    </AdminGate>
  );
}

function Content() {
  const { accountId } = Route.useParams();
  const { data, isLoading, error, refetch } = useQuery(adminMasterQueryOptions(accountId));
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: (next: boolean) => setAdminMasterPublic(accountId, next),
    onSuccess: (res) => {
      qc.setQueryData<AdminMasterDetail>(["admin", "masters", accountId], (prev) =>
        prev ? { ...prev, is_public: res.is_public } : prev,
      );
      qc.setQueryData<AdminMasterListItem[]>(["admin", "masters"], (prev) =>
        (prev ?? []).map((m) =>
          m.account_id === res.account_id ? { ...m, is_public: res.is_public } : m,
        ),
      );
      qc.invalidateQueries({ queryKey: ["masters", "directory"] });
      toast.success(res.is_public ? "Master is now public" : "Public listing revoked");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <Link
        to="/admin/masters"
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Master listings
      </Link>

      {isLoading && <PatientLoader label="Loading master…" />}
      {error && (
        <ErrorState
          message={`Couldn't load this master: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}

      {data && (
        <>
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold">
                  {data.display_name || "Unnamed master"}
                </h1>
                <VisibilityBadge isPublic={data.is_public} />
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                {data.account_id}
              </div>
            </div>
            <PublicToggle
              isPublic={data.is_public}
              pending={toggle.isPending}
              onChange={(next) => toggle.mutate(next)}
            />
          </header>

          {!data.agent_running && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-[11px] text-warning">
              <PowerOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                This master's terminal isn't running right now, so no trade history can be pulled.
                Everything else below is current.
              </span>
            </div>
          )}

          <Panel title="Profile">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {data.bio?.trim() || "No bio saved."}
            </p>
          </Panel>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Rate"
              value={data.rate ? `${data.rate.rate_percent}%` : "—"}
              sub="Charged to followers"
            />
            <Stat
              label="Platform cut"
              value={data.rate ? `${data.rate.platform_cut_percent}%` : "—"}
              sub="Of the master's fee"
            />
            <Stat label="Followers" value={String(data.follower_count)} sub="Currently copying" />
            <Stat
              label="Total earned"
              value={
                <NumericValue value={data.earnings.total_earned} format="currency" flash={false} />
              }
              sub={`${data.earnings.transaction_count} transaction(s)`}
            />
          </section>

          <Panel title="Recent earnings">
            {data.earnings.recent.length === 0 ? (
              <p className="text-xs text-muted-foreground">No earnings recorded yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full min-w-[420px] text-xs">
                  <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1 text-left">When</th>
                      <th className="px-2 py-1 text-left">Follower</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.earnings.recent.map((r, i) => (
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
          </Panel>

          <Panel title="Trade history">
            <TradesTable
              deals={data.trades}
              emptyLabel={
                data.agent_running
                  ? "No deals on this master's account yet."
                  : "Terminal offline — no trades available."
              }
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1.5 font-mono text-lg font-semibold">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
