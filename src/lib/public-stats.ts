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

export interface PublicMaster {
  accountId: string;
  displayName: string;
  /** Open, unrealised P&L on the master's own account — the only figure a
   *  signed-out visitor can legitimately see without a bearer token. */
  openPnl: number | null;
  followers: number;
}

/**
 * Unauthenticated social-proof list for the landing page. Anything RLS hides
 * simply yields an empty list, so the section renders nothing rather than an
 * error — same degrade-gracefully contract as `publicStatsQueryOptions`.
 */
export const publicMastersQueryOptions = () =>
  queryOptions({
    queryKey: ["public-masters"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<PublicMaster[]> => {
      const profilesRes = await supabase
        .from("master_profiles")
        .select("account_id,display_name,is_public")
        .eq("is_public", true)
        .limit(24);

      const profiles = (profilesRes.data ?? []) as {
        account_id: string;
        display_name: string | null;
      }[];
      if (profiles.length === 0) return [];

      const ids = profiles.map((p) => p.account_id);
      const [liveRes, subsRes] = await Promise.all([
        supabase
          .from("live_account_state")
          .select("account_id,balance,equity")
          .in("account_id", ids),
        supabase
          .from("subscriptions")
          .select("master_account_id,active")
          .in("master_account_id", ids),
      ]);

      const live = (liveRes.data ?? []) as LiveAccountState[];
      const subs = (subsRes.data ?? []) as { master_account_id: string; active: boolean }[];

      const pnlOf = new Map(
        live.map((r) => [
          r.account_id,
          typeof r.equity === "number" && typeof r.balance === "number"
            ? r.equity - r.balance
            : null,
        ]),
      );
      const followerCount = new Map<string, number>();
      for (const s of subs) {
        if (s.active === false) continue;
        followerCount.set(s.master_account_id, (followerCount.get(s.master_account_id) ?? 0) + 1);
      }

      return profiles
        .map((p) => ({
          accountId: p.account_id,
          displayName: p.display_name?.trim() || `Master ${p.account_id.slice(-4)}`,
          openPnl: pnlOf.get(p.account_id) ?? null,
          followers: followerCount.get(p.account_id) ?? 0,
        }))
        .sort((a, b) => (b.openPnl ?? -Infinity) - (a.openPnl ?? -Infinity))
        .slice(0, 4);
    },
  });
