/**
 * MOCK ONLY — platform admin analytics.
 *
 * Deterministic, in-memory sample data so the admin surface can be designed
 * and reviewed before any of it is wired to Cloud/backend aggregates.
 */
import { useSyncExternalStore } from "react";

/** Small deterministic PRNG so charts don't reshuffle on every render. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export interface RevenuePoint {
  month: string;
  infra: number;
  slots: number;
  profitShare: number;
}

export interface GrowthPoint {
  month: string;
  masters: number;
  followers: number;
}

export interface AdminUser {
  id: string;
  email: string;
  accountId: string;
  role: "master" | "follower";
  status: "live" | "paused" | "grace" | "debt" | "closed";
  joined: string;
  lifetimeValue: number;
}

export interface PayoutRequest {
  id: string;
  masterId: string;
  masterName: string;
  amount: number;
  requestedAt: string;
  // Mirrors the real `master_payouts` table, which only has these two states.
  status: "pending" | "paid";
}

export interface TopMasterRow {
  accountId: string;
  name: string;
  followers: number;
  netPnl: number;
  ratePct: number;
  revenue: number;
  drawdownPct: number;
}

export interface SymbolRow {
  symbol: string;
  volume: number;
  netPnl: number;
}

const MONTHS = [
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
];

function buildRevenue(): RevenuePoint[] {
  const r = rng(7);
  let infra = 1800;
  let slots = 2400;
  let ps = 900;
  return MONTHS.map((month) => {
    infra *= 1 + (r() * 0.18 - 0.02);
    slots *= 1 + (r() * 0.2 - 0.03);
    ps *= 1 + (r() * 0.3 - 0.06);
    return {
      month,
      infra: Math.round(infra),
      slots: Math.round(slots),
      profitShare: Math.round(ps),
    };
  });
}

function buildGrowth(): GrowthPoint[] {
  const r = rng(23);
  let masters = 24;
  let followers = 140;
  return MONTHS.map((month) => {
    masters += Math.round(r() * 9);
    followers += Math.round(r() * 52);
    return { month, masters, followers };
  });
}

/** trades per weekday x hour bucket — 7 rows of 24. */
function buildHeatmap(): number[][] {
  const r = rng(101);
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      const session = h >= 7 && h <= 20 ? 1 : 0.25;
      const weekend = d >= 5 ? 0.15 : 1;
      return Math.round(r() * 120 * session * weekend);
    }),
  );
}

const FIRST = ["Nova", "Apex", "Delta", "Orion", "Kite", "Vertex", "Lumen", "Cobalt"];
const LAST = ["FX", "Scalper", "Swing", "Capital", "Systems", "Macro", "Edge", "Desk"];

function buildTopMasters(): TopMasterRow[] {
  const r = rng(55);
  return FIRST.map((f, i) => ({
    accountId: `master_${(1000000 + i * 74531).toString(16)}`,
    name: `${f} ${LAST[i]}`,
    followers: 4 + Math.round(r() * 90),
    netPnl: Math.round((r() - 0.22) * 48000),
    ratePct: 10 + Math.round(r() * 20),
    revenue: Math.round(r() * 9400),
    drawdownPct: Number((2 + r() * 18).toFixed(1)),
  })).sort((a, b) => b.revenue - a.revenue);
}

function buildSymbols(): SymbolRow[] {
  const r = rng(88);
  return ["XAUUSD", "EURUSD", "GBPUSD", "US30", "NAS100", "USDJPY", "BTCUSD", "AUDUSD"]
    .map((symbol) => ({
      symbol,
      volume: Math.round(r() * 5200) + 300,
      netPnl: Math.round((r() - 0.4) * 32000),
    }))
    .sort((a, b) => b.volume - a.volume);
}

function buildUsers(): AdminUser[] {
  const r = rng(404);
  const statuses: AdminUser["status"][] = ["live", "live", "live", "paused", "grace", "debt", "closed"];
  return Array.from({ length: 26 }, (_, i) => {
    const role: AdminUser["role"] = r() > 0.68 ? "master" : "follower";
    const month = 1 + Math.floor(r() * 12);
    return {
      id: `u-${i + 1}`,
      email: `${FIRST[i % FIRST.length].toLowerCase()}${i + 1}@copydesk.io`,
      accountId: `${role}_${(3000000 + i * 91237).toString(16)}`,
      role,
      status: statuses[Math.floor(r() * statuses.length)],
      joined: `2026-${String(month).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
      lifetimeValue: Math.round(r() * 2400),
    };
  });
}

function buildPayouts(): PayoutRequest[] {
  const r = rng(909);
  return Array.from({ length: 6 }, (_, i) => ({
    id: `pr-${i + 1}`,
    masterId: `master_${(2000000 + i * 51237).toString(16)}`,
    masterName: `${FIRST[i]} ${LAST[i]}`,
    amount: Math.round(80 + r() * 3200),
    requestedAt: `2026-08-${String(3 + i * 4).padStart(2, "0")}`,
    status: "pending" as const,
  }));
}

export interface AdminState {
  revenue: RevenuePoint[];
  growth: GrowthPoint[];
  heatmap: number[][];
  topMasters: TopMasterRow[];
  symbols: SymbolRow[];
  users: AdminUser[];
  payouts: PayoutRequest[];
}

const initial: AdminState = {
  revenue: buildRevenue(),
  growth: buildGrowth(),
  heatmap: buildHeatmap(),
  topMasters: buildTopMasters(),
  symbols: buildSymbols(),
  users: buildUsers(),
  payouts: buildPayouts(),
};

let state: AdminState = initial;
const listeners = new Set<() => void>();

function setState(next: AdminState) {
  state = next;
  listeners.forEach((l) => l());
}

export const adminMock = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get() {
    return state;
  },
  resolvePayout(id: string, status: PayoutRequest["status"]) {
    setState({
      ...state,
      payouts: state.payouts.map((p) => (p.id === id ? { ...p, status } : p)),
    });
  },
  setUserStatus(id: string, status: AdminUser["status"]) {
    setState({
      ...state,
      users: state.users.map((u) => (u.id === id ? { ...u, status } : u)),
    });
  },
};

export function useAdminMock(): AdminState {
  return useSyncExternalStore(adminMock.subscribe, adminMock.get, adminMock.get);
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function currency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
