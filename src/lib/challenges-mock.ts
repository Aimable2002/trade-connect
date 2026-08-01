/**
 * MOCK ONLY — challenge / graduation system.
 *
 * No Supabase, no backend, no persistence. A tiny in-memory store so the
 * UX can be evaluated end-to-end before anything is committed to a schema.
 */
import { useSyncExternalStore } from "react";

export type ChallengeStatus = "locked" | "available" | "enrolled" | "passed";
export type MasterPhase = "challenger" | "graduated";

export interface ChallengeCriteria {
  winRatePct?: number;
  profitFactor?: number;
  maxDrawdownPct?: number;
  referrals?: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  /** Challenge 1 — the fixed, mandatory skills test. */
  isFixed: boolean;
  criteria: ChallengeCriteria;
  rewardAmount: number;
  active: boolean;
  status: ChallengeStatus;
}

export interface MonthlyResult {
  id: string;
  challengeId: string;
  challengeName: string;
  period: string;
  metrics: {
    winRatePct: number;
    profitFactor: number;
    maxDrawdownPct: number;
    referrals: number;
  };
  passed: boolean;
  rewardPaid: number | null;
  note?: string;
}

export interface ChallengeState {
  phase: MasterPhase;
  /** True when a severe drawdown breach demoted the master. */
  demoted: boolean;
  demotedAt: string | null;
  challenges: Challenge[];
  history: MonthlyResult[];
  /** This month's live-looking metrics. */
  current: {
    period: string;
    winRatePct: number;
    profitFactor: number;
    maxDrawdownPct: number;
    referrals: number;
  };
}

export const CRITERION_LABELS: Record<keyof ChallengeCriteria, string> = {
  winRatePct: "Win rate",
  profitFactor: "Profit factor",
  maxDrawdownPct: "Drawdown ceiling",
  referrals: "Referred followers",
};

export function formatCriterion(key: keyof ChallengeCriteria, value: number): string {
  switch (key) {
    case "winRatePct":
      return `≥ ${value}%`;
    case "profitFactor":
      return `≥ ${value.toFixed(2)}`;
    case "maxDrawdownPct":
      return `≤ ${value}%`;
    case "referrals":
      return `≥ ${value}`;
  }
}

export function formatMetric(key: keyof ChallengeCriteria, value: number): string {
  switch (key) {
    case "winRatePct":
      return `${value.toFixed(1)}%`;
    case "profitFactor":
      return value.toFixed(2);
    case "maxDrawdownPct":
      return `${value.toFixed(1)}%`;
    case "referrals":
      return String(value);
  }
}

export function criterionMet(
  key: keyof ChallengeCriteria,
  threshold: number,
  actual: number,
): boolean {
  return key === "maxDrawdownPct" ? actual <= threshold : actual >= threshold;
}

/** Any drawdown this far beyond the ceiling is treated as a severe breach. */
export const SEVERE_BREACH_MULTIPLIER = 2;

const initialState: ChallengeState = {
  phase: "challenger",
  demoted: false,
  demotedAt: null,
  current: {
    period: "2026-08",
    winRatePct: 61.4,
    profitFactor: 1.68,
    maxDrawdownPct: 7.9,
    referrals: 3,
  },
  challenges: [
    {
      id: "ch-1",
      name: "Challenge 1 — Skills test",
      description:
        "Mandatory prerequisite. No profit share while enrolled; a monthly reward is paid whenever the performance ratio is cleared. Passing graduates you to the public directory.",
      isFixed: true,
      criteria: { winRatePct: 55, profitFactor: 1.4, maxDrawdownPct: 10 },
      rewardAmount: 250,
      active: true,
      status: "enrolled",
    },
    {
      id: "ch-2",
      name: "Challenge 2 — Consistency",
      description:
        "Optional. Rewards steady month-over-month performance with a tighter drawdown ceiling.",
      isFixed: false,
      criteria: { winRatePct: 58, profitFactor: 1.6, maxDrawdownPct: 8 },
      rewardAmount: 500,
      active: true,
      status: "locked",
    },
    {
      id: "ch-3",
      name: "Challenge 3 — Growth",
      description:
        "Optional. Pairs trading quality with bringing followers onto the platform.",
      isFixed: false,
      criteria: { profitFactor: 1.5, referrals: 10 },
      rewardAmount: 750,
      active: true,
      status: "locked",
    },
    {
      id: "ch-4",
      name: "Challenge 4 — Elite",
      description:
        "Optional. The strictest tier: high win rate, high profit factor and a 5% drawdown ceiling.",
      isFixed: false,
      criteria: { winRatePct: 65, profitFactor: 2, maxDrawdownPct: 5, referrals: 25 },
      rewardAmount: 2000,
      active: true,
      status: "locked",
    },
  ],
  history: [
    {
      id: "h-7",
      challengeId: "ch-1",
      challengeName: "Challenge 1 — Skills test",
      period: "2026-07",
      metrics: { winRatePct: 59.2, profitFactor: 1.55, maxDrawdownPct: 8.4, referrals: 3 },
      passed: true,
      rewardPaid: 250,
    },
    {
      id: "h-6",
      challengeId: "ch-1",
      challengeName: "Challenge 1 — Skills test",
      period: "2026-06",
      metrics: { winRatePct: 52.1, profitFactor: 1.22, maxDrawdownPct: 9.1, referrals: 2 },
      passed: false,
      rewardPaid: null,
      note: "Win rate and profit factor below threshold — reward withheld.",
    },
    {
      id: "h-5",
      challengeId: "ch-1",
      challengeName: "Challenge 1 — Skills test",
      period: "2026-05",
      metrics: { winRatePct: 63.7, profitFactor: 1.81, maxDrawdownPct: 6.2, referrals: 2 },
      passed: true,
      rewardPaid: 250,
    },
    {
      id: "h-4",
      challengeId: "ch-2",
      challengeName: "Challenge 2 — Consistency",
      period: "2026-04",
      metrics: { winRatePct: 60.4, profitFactor: 1.64, maxDrawdownPct: 21.8, referrals: 2 },
      passed: false,
      rewardPaid: null,
      note: "Severe drawdown breach (21.8% vs 8% ceiling) — demoted to challenger, phase reset.",
    },
    {
      id: "h-3",
      challengeId: "ch-2",
      challengeName: "Challenge 2 — Consistency",
      period: "2026-03",
      metrics: { winRatePct: 61.9, profitFactor: 1.73, maxDrawdownPct: 7.1, referrals: 2 },
      passed: true,
      rewardPaid: 500,
    },
    {
      id: "h-2",
      challengeId: "ch-1",
      challengeName: "Challenge 1 — Skills test",
      period: "2026-02",
      metrics: { winRatePct: 57.8, profitFactor: 1.49, maxDrawdownPct: 9.6, referrals: 1 },
      passed: true,
      rewardPaid: 250,
    },
    {
      id: "h-1",
      challengeId: "ch-1",
      challengeName: "Challenge 1 — Skills test",
      period: "2026-01",
      metrics: { winRatePct: 48.3, profitFactor: 0.94, maxDrawdownPct: 11.7, referrals: 0 },
      passed: false,
      rewardPaid: null,
      note: "First month — below every threshold. Reward withheld.",
    },
  ],
};

let state: ChallengeState = initialState;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: ChallengeState) {
  state = next;
  emit();
}

export const challengeMock = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get() {
    return state;
  },
  enroll(id: string) {
    setState({
      ...state,
      challenges: state.challenges.map((c) =>
        c.id === id && c.status === "available" ? { ...c, status: "enrolled" } : c,
      ),
    });
  },
  unenroll(id: string) {
    setState({
      ...state,
      challenges: state.challenges.map((c) =>
        c.id === id && c.status === "enrolled" && !c.isFixed ? { ...c, status: "available" } : c,
      ),
    });
  },
  /** Demo affordance: mark challenge 1 passed and graduate. */
  passChallengeOne() {
    setState({
      ...state,
      phase: "graduated",
      demoted: false,
      demotedAt: null,
      challenges: state.challenges.map((c) =>
        c.isFixed
          ? { ...c, status: "passed" }
          : c.status === "locked"
            ? { ...c, status: "available" }
            : c,
      ),
    });
  },
  /** Demo affordance: severe drawdown breach → demotion, history preserved. */
  demote() {
    setState({
      ...state,
      phase: "challenger",
      demoted: true,
      demotedAt: new Date().toISOString(),
      current: { ...state.current, maxDrawdownPct: 23.4 },
      challenges: state.challenges.map((c) =>
        c.isFixed ? { ...c, status: "enrolled" } : { ...c, status: "locked" },
      ),
    });
  },
  reset() {
    setState(initialState);
  },
  upsertChallenge(c: Challenge) {
    const exists = state.challenges.some((x) => x.id === c.id);
    setState({
      ...state,
      challenges: exists
        ? state.challenges.map((x) => (x.id === c.id ? c : x))
        : [...state.challenges, c],
    });
  },
  toggleActive(id: string) {
    setState({
      ...state,
      challenges: state.challenges.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    });
  },
};

export function useChallengeMock(): ChallengeState {
  return useSyncExternalStore(
    challengeMock.subscribe,
    challengeMock.get,
    challengeMock.get,
  );
}
