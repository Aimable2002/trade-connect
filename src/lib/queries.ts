import { queryOptions } from "@tanstack/react-query";
import {
  supabase,
  type AccountRow,
  type LiveAccountState,
  type SubscriptionRow,
} from "./supabase";
import {
  getAccountTrades,
  getMasterTrades,
  getMastersDirectory,
  type Deal,
  type DirectoryMaster,
} from "./api";

export const accountsQueryOptions = () =>
  queryOptions({
    queryKey: ["accounts"],
    queryFn: async (): Promise<AccountRow[]> => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
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
