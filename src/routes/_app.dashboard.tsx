import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { accountsQueryOptions } from "@/lib/queries";
import { useLiveAccountState } from "@/hooks/useLiveAccountState";
import { AccountCard } from "@/components/AccountCard";
import { Activity, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: accounts, isLoading, error } = useQuery(accountsQueryOptions());
  // console.log(" account data :", accounts)
  useEffect(() => {
    if (!isLoading && accounts && accounts.length === 0) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isLoading, accounts, navigate]);

  const ids = (accounts ?? []).map((a) => a.account_id);
  const { data: liveMap } = useLiveAccountState(ids);
  // console.log(" Live state data :", liveMap)
  if (isLoading) {
    return (
      <div className="grid h-64 place-items-center">
        <Activity className="h-4 w-4 animate-pulse text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-loss">
        Could not load accounts: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Terminal
          </div>
          <h1 className="mt-1 truncate text-2xl font-semibold">
            Your accounts
          </h1>
        </div>
        <Link
          to="/onboarding"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          <Plus className="h-3.5 w-3.5" />
          Add account
        </Link>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {(accounts ?? []).map((a) => (
          <AccountCard
            key={a.account_id}
            account={a}
            live={liveMap?.[a.account_id]}
          />
        ))}
      </div>

      {(accounts ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No accounts yet. Redirecting to onboarding…
        </div>
      )}
    </div>
  );
}
