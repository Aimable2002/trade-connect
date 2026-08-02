import { queryOptions } from "@tanstack/react-query";
import { supabase, type AccountRow, type LiveAccountState } from "./supabase";

export interface PublicStats {
  masters: number;
  followers: number;
  liveAccounts: number;
  /** Median age of the newest live-state rows, in ms. Null when no feed rows. */
  feedLatencyMs: number | null;
  /** Aggregate unrealised follower return from copied master signals. */
  followerReturnAbs: number | null;
  followerReturnPct: number | null;
  totalEquity: number | null;
  /** Per-account open return, richest first, anonymised for public display. */
  top: { id: string; label: string; pct: number | null; abs: number }[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Public, unauthenticated snapshot for the landing page. Reads the same
 * Supabase tables the app uses; anything RLS hides simply resolves to null
 * so the marketing page degrades to a dash instead of an error.
 */
export const publicStatsQueryOptions = () =>
  queryOptions({
    queryKey: ["public-stats"],
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async (): Promise<PublicStats> => {
      const [accountsRes, liveRes] = await Promise.all([
        supabase.from("accounts").select("account_id,role,status"),
        supabase
          .from("live_account_state")
          .select("account_id,balance,equity,open_positions,updated_at"),
      ]);

      const accounts = (accountsRes.data ?? []) as AccountRow[];
      const live = (liveRes.data ?? []) as LiveAccountState[];

      const roleOf = new Map(accounts.map((a) => [a.account_id, a.role]));
      const masters = accounts.filter((a) => a.role === "master").length;
      const followers = accounts.filter((a) => a.role === "follower").length;
      const liveAccounts = accounts.filter((a) => a.status === "live").length;

      const now = Date.now();
      const ages = live
        .map((r) => (r.updated_at ? now - new Date(r.updated_at).getTime() : null))
        .filter((n): n is number => n !== null && isFinite(n) && n >= 0);

      const followerLive = live.filter(
        (r) =>
          roleOf.get(r.account_id) === "follower" &&
          typeof r.balance === "number" &&
          typeof r.equity === "number",
      );
      const balSum = followerLive.reduce((s, r) => s + (r.balance ?? 0), 0);
      const eqSum = followerLive.reduce((s, r) => s + (r.equity ?? 0), 0);

      const totalEquityRows = live.filter((r) => typeof r.equity === "number");

      const top = live
        .filter((r) => typeof r.equity === "number" && typeof r.balance === "number")
        .map((r) => {
          const abs = (r.equity ?? 0) - (r.balance ?? 0);
          const pct = r.balance ? (abs / r.balance) * 100 : null;
          return {
            id: r.account_id,
            label: `${roleOf.get(r.account_id) === "master" ? "Master" : "Account"} ${r.account_id.slice(-4)}`,
            pct,
            abs,
          };
        })
        .sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs))
        .slice(0, 3);

      return {
        masters,
        followers,
        liveAccounts,
        feedLatencyMs: median(ages),
        followerReturnAbs: followerLive.length ? eqSum - balSum : null,
        followerReturnPct: followerLive.length && balSum ? ((eqSum - balSum) / balSum) * 100 : null,
        totalEquity: totalEquityRows.length
          ? totalEquityRows.reduce((s, r) => s + (r.equity ?? 0), 0)
          : null,
        top,
      };
    },
  });

export function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}m`;
}
