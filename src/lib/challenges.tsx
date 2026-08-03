import type { Challenge, ChallengeCriteria } from "./api";

/**
 * Criteria come from a jsonb column an admin can extend at will, so nothing
 * here may assume a fixed key set. Known keys get a curated label; anything
 * else is humanised from the key itself.
 */
const KNOWN_LABELS: Record<string, string> = {
  winRatePct: "Win rate",
  win_rate_pct: "Win rate",
  profitFactor: "Profit factor",
  profit_factor: "Profit factor",
  maxDrawdownPct: "Drawdown ceiling",
  max_drawdown_pct: "Drawdown ceiling",
  referrals: "Referred followers",
  referral_count: "Referred followers",
};

export function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function criterionLabel(key: string): string {
  return KNOWN_LABELS[key] ?? humanizeKey(key);
}

/** Drawdown-style criteria are ceilings ("at most"), everything else a floor. */
export function isCeilingCriterion(key: string): boolean {
  return /drawdown|max_?dd|loss/i.test(key);
}

export function isPercentCriterion(key: string): boolean {
  return /pct|percent|rate/i.test(key);
}

export function formatCriterionValue(key: string, value: unknown): string {
  if (typeof value === "number") {
    const num = isPercentCriterion(key)
      ? `${value}%`
      : Number.isInteger(value)
        ? String(value)
        : value.toFixed(2);
    return `${isCeilingCriterion(key) ? "≤" : "≥"} ${num}`;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null) return "—";
  return String(value);
}

export function criteriaEntries(
  criteria: ChallengeCriteria | null | undefined,
): Array<[string, unknown]> {
  if (!criteria || typeof criteria !== "object") return [];
  return Object.entries(criteria);
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
          <span className="text-muted-foreground">{criterionLabel(k)}</span>
          <span className="font-mono">{formatCriterionValue(k, v)}</span>
        </li>
      ))}
    </ul>
  );
}
