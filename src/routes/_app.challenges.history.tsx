import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useChallengeMock } from "@/lib/challenges-mock";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";

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
  const state = useChallengeMock();
  const totalPaid = state.history.reduce((a, h) => a + (h.rewardPaid ?? 0), 0);
  const passes = state.history.filter((h) => h.passed).length;

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
          <Stat label="Months passed" value={`${passes}/${state.history.length}`} />
          <Stat label="Rewards paid" value={`$${totalPaid.toLocaleString()}`} accent />
        </div>
      </header>

      <PlaceholderBanner text="Mock data — challenge history is not wired to a backend yet." />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-[9px] uppercase tracking-widest text-muted-foreground">
              <th className="px-3 py-2 text-left">Period</th>
              <th className="px-3 py-2 text-left">Challenge</th>
              <th className="px-3 py-2 text-right">Win rate</th>
              <th className="px-3 py-2 text-right">Profit factor</th>
              <th className="px-3 py-2 text-right">Max DD</th>
              <th className="px-3 py-2 text-right">Referrals</th>
              <th className="px-3 py-2 text-left">Result</th>
              <th className="px-3 py-2 text-right">Reward</th>
            </tr>
          </thead>
          <tbody>
            {state.history.map((h) => (
              <tr key={h.id} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{h.period}</td>
                <td className="px-3 py-2 text-xs">
                  {h.challengeName}
                  {h.note && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{h.note}</div>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {h.metrics.winRatePct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {h.metrics.profitFactor.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {h.metrics.maxDrawdownPct.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">{h.metrics.referrals}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                      h.passed
                        ? "border-profit/40 bg-profit/10 text-profit"
                        : "border-loss/40 bg-loss/10 text-loss"
                    }`}
                  >
                    {h.passed ? "passed" : "failed"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {h.rewardPaid === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-profit">${h.rewardPaid.toLocaleString()}</span>
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
