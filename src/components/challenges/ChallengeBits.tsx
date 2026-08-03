import type { Challenge } from "@/lib/api";
import { criteriaEntries, criterionLabel, formatCriterionValue } from "@/lib/challenges";

/**
 * Derived client-side from real enrollment state — the backend has no
 * per-master "status" column on the challenge itself.
 */
export type ChallengeStatus = "locked" | "available" | "enrolled" | "inactive";

export function ChallengeStatusBadge({ status }: { status: ChallengeStatus }) {
  const map: Record<ChallengeStatus, string> = {
    locked: "border-border bg-muted/40 text-muted-foreground",
    available: "border-primary/40 bg-primary/10 text-primary",
    enrolled: "border-warning/40 bg-warning/10 text-warning",
    inactive: "border-border bg-muted/40 text-muted-foreground",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function CriteriaSummary({ challenge }: { challenge: Challenge }) {
  const entries = criteriaEntries(challenge.criteria);
  if (entries.length === 0) {
    return <div className="text-xs text-muted-foreground">No criteria set.</div>;
  }
  return (
    <ul className="space-y-1">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate text-muted-foreground">{criterionLabel(k)}</span>
          <span className="shrink-0 font-mono">{formatCriterionValue(k, v)}</span>
        </li>
      ))}
    </ul>
  );
}
