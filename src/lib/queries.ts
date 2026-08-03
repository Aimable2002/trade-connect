import { queryOptions } from "@tanstack/react-query";
import {
  supabase,
  type AccountRow,
  type LiveAccountState,
  type SubscriptionRow,
} from "./supabase";
import {
  getAccountTrades,
  getChallengeHistory,
  getChallengeStatus,
  getChallenges,
  getBilling,
  getMasterEarnings,
  getMasterProfile,
  getMasterRate,
  getMasterTrades,
  getMastersDirectory,
  getRoster,
  getWallet,
  getWalletTransactions,
  ApiError,
  type Billing,
  type Challenge,
  type ChallengeHistoryResponse,
  type ChallengeStatusResponse,
  type Deal,
  type DirectoryMaster,
  type MasterEarnings,
  type MasterProfile,
  type MasterRate,
  type RosterResponse,
  type Wallet,
  type WalletTransaction,
} from "./api";

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: ["accounts"],
    queryFn: async (): Promise<AccountRow[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .neq("status", "closed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AccountRow[];
    },
  });

export const subscriptionsQueryOptions = () =>
  queryOptions({
    queryKey: ["subscriptions"],
    queryFn: async (): Promise<SubscriptionRow[]> => {
      const { data, error } = await supabase.from("subscriptions").select("*");
      if (error) throw error;
      return (data ?? []) as SubscriptionRow[];
    },
  });

export const liveAccountStateQueryOptions = (accountIds: string[]) =>
  queryOptions({
    queryKey: ["live_account_state", ...accountIds.slice().sort()],
    enabled: accountIds.length > 0,
    queryFn: async (): Promise<Record<string, LiveAccountState>> => {
      if (accountIds.length === 0) return {};
      const { data, error } = await supabase
        .from("live_account_state")
        .select("*")
        .in("account_id", accountIds);
      if (error) throw error;
      const map: Record<string, LiveAccountState> = {};
      for (const row of (data ?? []) as LiveAccountState[]) {
        map[row.account_id] = row;
      }
      return map;
    },
  });

export const mastersDirectoryQueryOptions = () =>
  queryOptions({
    queryKey: ["masters", "directory"],
    queryFn: (): Promise<DirectoryMaster[]> => getMastersDirectory(),
    staleTime: 60_000,
  });

// This account's own profile, regardless of public/private - unlike
// mastersDirectoryQueryOptions above, which only ever returns already-public
// masters and so can't be used to pre-fill an editor for a private profile.
// A 404 means "this master has never saved a profile" - a real, valid
// result (a genuinely blank editor), not a fetch failure, so it resolves to
// null instead of throwing.
export const masterProfileQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "profile"],
    enabled: !!accountId,
    queryFn: async (): Promise<MasterProfile | null> => {
      try {
        return await getMasterProfile(accountId!);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    staleTime: 10_000,
  });

export const accountTradesQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["accounts", accountId, "trades"],
    enabled: !!accountId,
    queryFn: (): Promise<Deal[]> => getAccountTrades(accountId as string),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  });

export const masterTradesQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "trades"],
    enabled: !!accountId,
    queryFn: (): Promise<Deal[]> => getMasterTrades(accountId as string),
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: false,
  });

export const masterRateQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "rate"],
    enabled: !!accountId,
    queryFn: (): Promise<MasterRate> => getMasterRate(accountId as string),
    staleTime: 30_000,
  });

export const masterEarningsQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "earnings"],
    enabled: !!accountId,
    queryFn: (): Promise<MasterEarnings> =>
      getMasterEarnings(accountId as string),
    staleTime: 30_000,
  });

export const walletQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["accounts", accountId, "wallet"],
    enabled: !!accountId,
    queryFn: (): Promise<Wallet> => getWallet(accountId as string),
    staleTime: 15_000,
  });

export const walletTxQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["accounts", accountId, "wallet", "transactions"],
    enabled: !!accountId,
    queryFn: (): Promise<WalletTransaction[]> =>
      getWalletTransactions(accountId as string),
    staleTime: 15_000,
  });

export const billingQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["accounts", accountId, "billing"],
    enabled: !!accountId,
    queryFn: (): Promise<Billing> => getBilling(accountId as string),
    staleTime: 15_000,
  });

export const rosterQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["accounts", accountId, "roster"],
    enabled: !!accountId,
    queryFn: (): Promise<RosterResponse> => getRoster(accountId as string),
    staleTime: 15_000,
  });

export interface Package {
  code: string;
  duration_days: number;
  infra_fee: number;
  slot_fee_per_slot: number;
  base_roster_size: number;
  is_active: boolean;
}

export const packagesQueryOptions = () =>
  queryOptions({
    queryKey: ["packages"],
    queryFn: async (): Promise<Package[]> => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as Package[];
    },
    staleTime: 5 * 60_000,
  });

export const challengesQueryOptions = () =>
  queryOptions({
    queryKey: ["challenges"],
    queryFn: (): Promise<Challenge[]> => getChallenges(),
    staleTime: 60_000,
  });

export const challengeStatusQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "challenges", "status"],
    enabled: !!accountId,
    queryFn: (): Promise<ChallengeStatusResponse> =>
      getChallengeStatus(accountId as string),
    staleTime: 15_000,
  });

export const challengeHistoryQueryOptions = (accountId: string | undefined) =>
  queryOptions({
    queryKey: ["masters", accountId, "challenges", "history"],
    enabled: !!accountId,
    queryFn: (): Promise<ChallengeHistoryResponse> =>
      getChallengeHistory(accountId as string),
    staleTime: 30_000,
  });
