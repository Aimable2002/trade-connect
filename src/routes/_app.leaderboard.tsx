import { createFileRoute } from "@tanstack/react-router";
import { RiskBadge } from "@/components/RiskBadge";
import { NumericValue } from "@/components/NumericValue";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export const Route = createFileRoute("/_app/leaderboard")({
  component: Leaderboard,
});

const LEADERS = [
  { rank: 1, name: "Redshift Scalper", score: 92.4, return90: 41.2, risk: 9, followers: 63 },
  { rank: 2, name: "Kite Momentum", score: 88.1, return90: 29.7, risk: 7, followers: 91 },
  { rank: 3, name: "Northwind Systematic", score: 84.6, return90: 22.1, risk: 4, followers: 214 },
  { rank: 4, name: "Meridian Macro", score: 79.3, return90: 12.4, risk: 3, followers: 508 },
  { rank: 5, name: "Orbit Carry", score: 71.8, return90: 8.6, risk: 2, followers: 176 },
  { rank: 6, name: "Halcyon Vol", score: 55.2, return90: -4.9, risk: 8, followers: 42 },
];

function Leaderboard() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Ranked
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Composite score blends risk-adjusted return, consistency, track
          record, and follower count. Risk shown separately on a 1–10 scale.
        </p>
      </header>
      <PlaceholderBanner text="Preview data — real scoring model ships alongside the master directory." />

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Master</th>
              <th className="px-4 py-2 text-right">Score</th>
              <th className="px-4 py-2 text-right">90d</th>
              <th className="px-4 py-2 text-right">Followers</th>
              <th className="px-4 py-2 text-right">Risk</th>
            </tr>
          </thead>
          <tbody>
            {LEADERS.map((l) => (
              <tr key={l.rank} className="border-t border-border">
                <td className="px-4 py-3 font-mono tabular text-muted-foreground">
                  {String(l.rank).padStart(2, "0")}
                </td>
                <td className="px-4 py-3">{l.name}</td>
                <td className="px-4 py-3 text-right font-mono tabular">
                  {l.score.toFixed(1)}
                </td>
                <td
                  className={`px-4 py-3 text-right ${l.return90 >= 0 ? "text-profit" : "text-loss"}`}
                >
                  <NumericValue value={l.return90} format="signed" flash={false} />%
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-muted-foreground">
                  {l.followers}
                </td>
                <td className="px-4 py-3 text-right">
                  <RiskBadge risk={l.risk} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 md:hidden">
        {LEADERS.map((l) => (
          <div
            key={l.rank}
            className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
          >
            <div className="w-6 shrink-0 font-mono tabular text-sm text-muted-foreground">
              {String(l.rank).padStart(2, "0")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{l.name}</div>
              <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>score <span className="font-mono tabular text-foreground">{l.score.toFixed(1)}</span></span>
                <span className={l.return90 >= 0 ? "text-profit" : "text-loss"}>
                  <NumericValue value={l.return90} format="signed" flash={false} />%
                </span>
              </div>
            </div>
            <RiskBadge risk={l.risk} />
          </div>
        ))}
      </div>
    </div>
  );
}
