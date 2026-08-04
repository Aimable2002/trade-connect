import type { Package } from "./queries";

/**
 * Display-name / positioning lookup only. NOTHING price-related lives here —
 * every dollar figure, roster size and duration on the pricing page is
 * computed at render time from the live `packages` rows.
 */
const TIER_COPY: Record<string, { name: string; pitch: string }> = {
  "1m": {
    name: "Flex",
    pitch: "No commitment. Try copy trading for a month and walk away if it isn't for you.",
  },
  "3m": {
    name: "Momentum",
    pitch: "Long enough to judge a real track record instead of a lucky week.",
  },
  "6m": {
    name: "Compounder",
    pitch: "The tier that widens your roster — run more masters at once and compound across them.",
  },
  "12m": {
    name: "All-In",
    pitch: "Best economics per day. For followers who already know this works for them.",
  },
};

export function tierName(code: string): string {
  return TIER_COPY[code]?.name ?? code.toUpperCase();
}

export function tierPitch(code: string): string | null {
  return TIER_COPY[code]?.pitch ?? null;
}

/** Platform's share of copied-trading profit. */
export const PLATFORM_CUT_PCT = 20;

/**
 * Bundled wallet credit granted when a package is selected or switched.
 * ⚠️ Not finalised — the backend is the source of truth once it ships.
 * `null` means "amount not published yet" and the UI must say so rather
 * than invent a number.
 */
export const BUNDLED_TOPUP_BY_CODE: Record<string, number | null> = {};

export function bundledTopup(code: string): number | null {
  return BUNDLED_TOPUP_BY_CODE[code] ?? null;
}

export function cycleCost(p: Package): number {
  return p.infra_fee + p.slot_fee_per_slot;
}

export function costPerDay(p: Package): number {
  return p.duration_days > 0 ? cycleCost(p) / p.duration_days : cycleCost(p);
}

export function costPerMonth(p: Package): number {
  return costPerDay(p) * 30;
}

export interface TierInsight {
  pkg: Package;
  perDay: number;
  perMonth: number;
  /** % cheaper per day than the shortest-commitment tier. 0 for the baseline. */
  savingsPct: number;
  /** First tier in the sorted list whose roster size increases. */
  unlocksRoster: boolean;
  rosterDelta: number;
  recommended: boolean;
}

/**
 * Sort by commitment length and derive every comparative claim from the data:
 * per-day cost, savings vs. the baseline tier, and where the roster jumps.
 */
export function buildTierInsights(packages: Package[]): TierInsight[] {
  const sorted = [...packages].sort((a, b) => a.duration_days - b.duration_days);
  if (sorted.length === 0) return [];
  const baseline = costPerDay(sorted[0]);

  let rosterUnlockIndex = -1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].base_roster_size > sorted[i - 1].base_roster_size) {
      rosterUnlockIndex = i;
      break;
    }
  }

  return sorted.map((pkg, i) => {
    const perDay = costPerDay(pkg);
    return {
      pkg,
      perDay,
      perMonth: perDay * 30,
      savingsPct: baseline > 0 ? Math.max(0, ((baseline - perDay) / baseline) * 100) : 0,
      unlocksRoster: i === rosterUnlockIndex,
      rosterDelta: i > 0 ? pkg.base_roster_size - sorted[i - 1].base_roster_size : 0,
      recommended:
        rosterUnlockIndex >= 0 ? i === rosterUnlockIndex : i === Math.min(1, sorted.length - 1),
    };
  });
}

export interface BreakevenResult {
  topup: number | null;
  /** Copied-trading profit needed before the 20% cut consumes the bundled credit. */
  profitToBreakeven: number | null;
  /** That profit as a % return on the follower's stated MT5 capital. */
  returnPctToBreakeven: number | null;
}

export function breakeven(topup: number | null, capital: number): BreakevenResult {
  if (topup === null || topup <= 0) {
    return { topup, profitToBreakeven: null, returnPctToBreakeven: null };
  }
  const profit = topup / (PLATFORM_CUT_PCT / 100);
  return {
    topup,
    profitToBreakeven: profit,
    returnPctToBreakeven: capital > 0 ? (profit / capital) * 100 : null,
  };
}
