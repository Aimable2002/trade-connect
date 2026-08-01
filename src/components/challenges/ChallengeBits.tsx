import type { Challenge, ChallengeCriteria, ChallengeStatus } from "@/lib/challenges-mock";
import {
  CRITERION_LABELS,
  criterionMet,
  formatCriterion,
  formatMetric,
} from "@/lib/challenges-mock";
import { Check, X } from "lucide-react";

export function ChallengeStatusBadge({ status }: { status: ChallengeStatus }) {
  const map: Record<ChallengeStatus, string> = {
    locked: "border-border bg-muted/40 text-muted-foreground",
    available: "border-primary/40 bg-primary/10 text-primary",
    enrolled: "border-warning/40 bg-warning/10 text-warning",
    passed: "border-profit/40 bg-profit/10 text-profit",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function criteriaEntries(
  criteria: ChallengeCriteria,
): Array<[keyof ChallengeCriteria, number]> {
  return Object.entries(criteria).filter(([, v]) => typeof v === "number") as Array<
    [keyof ChallengeCriteria, number]
  >;
}

export function CriteriaSummary({ challenge }: { challenge: Challenge }) {
  return (
    <ul className="space-y-1">
      {criteriaEntries(challenge.criteria).map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">{CRITERION_LABELS[k]}</span>
          <span className="font-mono">{formatCriterion(k, v)}</span>
        </li>
      ))}
    </ul>
  );
}

export function CriteriaChecklist({
  criteria,
  metrics,
}: {
  criteria: ChallengeCriteria;
  metrics: Record<string, number>;
}) {
  return (
    <ul className="space-y-1.5">
      {criteriaEntries(criteria).map(([k, v]) => {
        const actual = metrics[k] ?? 0;
        const ok = criterionMet(k, v, actual);
        return (
          <li
            key={k}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-background/60 px-2 py-1.5"
          >
            <span className="flex items-center gap-2 text-xs">
              {ok ? (
                <Check className="h-3 w-3 text-profit" />
              ) : (
                <X className="h-3 w-3 text-loss" />
              )}
              <span className="text-muted-foreground">{CRITERION_LABELS[k]}</span>
            </span>
            <span className="font-mono text-xs">
              <span className={ok ? "text-profit" : "text-loss"}>{formatMetric(k, actual)}</span>
              <span className="text-muted-foreground"> / {formatCriterion(k, v)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
