import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type LiveAccountState } from "@/lib/supabase";
import { liveAccountStateQueryOptions } from "@/lib/queries";

export function useLiveAccountState(accountIds: string[]) {
  const queryClient = useQueryClient();
  const query = useQuery(liveAccountStateQueryOptions(accountIds));

  useEffect(() => {
    if (accountIds.length === 0) return;
    const key = liveAccountStateQueryOptions(accountIds).queryKey;
    const channel = supabase
      .channel(`live_account_state:${accountIds.join(",")}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_account_state",
          filter: `account_id=in.(${accountIds.join(",")})`,
        },
        (payload) => {
          const row = payload.new as LiveAccountState | undefined;
          if (!row || !row.account_id) return;
          queryClient.setQueryData<Record<string, LiveAccountState>>(
            key,
            (prev) => ({ ...(prev ?? {}), [row.account_id]: row }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIds.join(",")]);

  return query;
}
