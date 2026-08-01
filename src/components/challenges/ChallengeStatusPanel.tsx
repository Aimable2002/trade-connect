import { Link } from "@tanstack/react-router";
import { AlertTriangle, GraduationCap } from "lucide-react";
import {
  SEVERE_BREACH_MULTIPLIER,
  useChallengeMock,
} from "@/lib/challenges-mock";
import {
  ChallengeStatusBadge,
  CriteriaChecklist,
} from "@/components/challenges/ChallengeBits";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";

/** MOCK ONLY — master-role challenge status for one account. */
export function ChallengeStatusPanel() {
  const state = useChallengeMock();
  const active = state.challenges.filter(
    (c) => c.status === "enrolled" || c.status === "passed",
  );
  const metrics: Record<string, number> = {
    winRatePct: state.current.winRatePct,
    profitFactor: state.current.profitFactor,
    maxDrawdownPct: state.current.maxDrawdownPct,
    referrals: state.current.referrals,
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Challenge status
        </div>
        <Link
          to="/challenges"
          className="text-[10px] uppercase tracking-widest text-primary hover:underline"
        >
          All challenges
        </Link>
      </div>

      <div className="mt-3">
        <PlaceholderBanner text="Mock data — challenge metrics are simulated." />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded border border-border bg-background/60 px-2 py-1 text-xs">
          <GraduationCap className="h-3.5 w-3.5 text-primary" />
          Phase:{" "}
          <span
            className={
              state.phase === "graduated"
                ? "font-semibold text-profit"
                : "font-semibold text-warning"
            }
          >
            {state.phase}
          </span>
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Period {state.current.period}
        </span>
      </div>

      {state.demoted && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-loss/40 bg-loss/10 p-2 text-xs text-loss">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <div className="font-semibold uppercase tracking-widest">Drawdown breach — demoted</div>
            <p className="mt-0.5 opacity-90">
              A drawdown of {state.current.maxDrawdownPct.toFixed(1)}% exceeded the ceiling by more
              than {SEVERE_BREACH_MULTIPLIER}×. This is a demotion, not a missed criterion: your
              phase reset to challenger and optional challenges relocked. Missing an ordinary
              criterion only withholds that month's reward.
            </p>
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Not enrolled in any challenge.{" "}
          <Link to="/challenges" className="text-primary hover:underline">
            Browse challenges
          </Link>
          .
        </div>
      )}

      <div className="mt-3 space-y-3">
        {active.map((c) => {
          const ceiling = c.criteria.maxDrawdownPct;
          const breach =
            ceiling !== undefined &&
            state.current.maxDrawdownPct > ceiling * SEVERE_BREACH_MULTIPLIER;
          return (
            <div key={c.id} className="rounded-md border border-border bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">{c.name}</div>
                <ChallengeStatusBadge status={c.status} />
              </div>
              <div className="mt-2">
                <CriteriaChecklist criteria={c.criteria} metrics={metrics} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <span
                  className={
                    breach ? "uppercase tracking-widest text-loss" : "text-muted-foreground"
                  }
                >
                  {breach
                    ? "Drawdown breach — demotion trigger"
                    : "Criteria evaluated at month end"}
                </span>
                <span className="font-mono text-profit">
                  ${c.rewardAmount.toLocaleString()}/mo
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
