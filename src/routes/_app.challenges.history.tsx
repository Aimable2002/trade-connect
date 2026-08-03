import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { accountsQueryOptions, challengeHistoryQueryOptions } from "@/lib/queries";
import { ErrorState, PatientLoader } from "@/components/DataState";

export const Route = createFileRoute("/_app/challenges/history")({
  head: () => ({
    meta: [
      { title: "Challenge History — CopyDesk" },
      {
        name: "description",
        content:
          "Past challenge enrolments and month-by-month results, rewards paid and drawdown breaches.",
      },
      { property: "og:title", content: "Challenge History — CopyDesk" },
      {
        property: "og:description",
        content: "Month-by-month challenge results, rewards paid and breaches.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChallengeHistoryPage,
});

function ChallengeHistoryPage() {
  const accountsQ = useQuery(accountsQueryOptions());
  const masters = useMemo(
    () => (accountsQ.data ?? []).filter((a) => a.role === "master"),
    [accountsQ.data],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const accountId = selected ?? masters[0]?.account_id ?? undefined;

  const { data, isLoading, error, refetch } = useQuery(
    challengeHistoryQueryOptions(accountId),
  );

  const results = data?.monthly_results ?? [];
  const enrollments = data?.enrollments ?? [];
  const totalPaid = results.reduce((a, r) => a + (r.reward_paid ?? 0), 0);
  const passes = results.filter((r) => r.passed).length;

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/challenges"
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Challenges
          </Link>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">
            CHALLENGE HISTORY
          </h1>
        </div>
        <div className="flex gap-4">
          <Stat label="Months passed" value={`${passes}/${results.length}`} />
          <Stat label="Rewards paid" value={`$${totalPaid.toLocaleString()}`} accent />
        </div>
      </header>

      {masters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {masters.map((m) => (
            <button
              key={m.account_id}
              onClick={() => setSelected(m.account_id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                m.account_id === accountId
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {m.account_id}
            </button>
          ))}
        </div>
      )}

      {isLoading && <PatientLoader label="Loading history…" />}
      {error && (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      )}

      {data && (
        <>
          <section>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Enrolments
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left">Challenge</th>
                    <th className="px-3 py-2 text-left">Enrolled</th>
                    <th className="px-3 py-2 text-left">Left</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-xs text-muted-foreground">
                        No enrolments yet.
                      </td>
                    </tr>
                  )}
                  {enrollments.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 text-xs">
                        {e.challenge_name ?? e.challenge?.name ?? e.challenge_id}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {e.left_at ? new Date(e.left_at).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {e.status ?? (e.left_at ? "left" : "active")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
              Monthly results
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground">
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-left">Challenge</th>
                    <th className="px-3 py-2 text-left">Result</th>
                    <th className="px-3 py-2 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-xs text-muted-foreground">
                        No scored periods yet — monthly evaluation runs at period close.
                      </td>
                    </tr>
                  )}
                  {results.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs">{r.period ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.challenge_name ?? r.challenge_id}
                        {r.note && (
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{r.note}</div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                            r.passed
                              ? "border-profit/40 bg-profit/10 text-profit"
                              : "border-loss/40 bg-loss/10 text-loss"
                          }`}
                        >
                          {r.passed ? "passed" : "failed"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {r.reward_paid == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="text-profit">
                            ${r.reward_paid.toLocaleString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono text-sm font-semibold ${accent ? "text-profit" : ""}`}>
        {value}
      </div>
    </div>
  );
}
