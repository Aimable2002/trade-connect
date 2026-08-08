import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accountTradesQueryOptions, accountsQueryOptions } from "@/lib/queries";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { TradesTable } from "@/components/TradesTable";
import { PatientLoader, ErrorState } from "@/components/DataState";

export const Route = createFileRoute("/_app/history")({
  component: History,
});

function History() {
  const { data: accounts } = useQuery(accountsQueryOptions());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && accounts && accounts.length > 0) {
      setSelected(accounts[0].account_id);
    }
  }, [accounts, selected]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Log</div>
        <h1 className="mt-1 text-2xl font-semibold">Trade history</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Live pull from the source account — the first request per account takes about 10 seconds.
        </p>
      </header>

      <div className="flex flex-wrap gap-1">
        {(accounts ?? []).length === 0 && (
          <div className="text-xs text-muted-foreground">
            No accounts yet. Provision one from Onboarding.
          </div>
        )}
        {(accounts ?? []).map((a) => (
          <FilterChip
            key={a.account_id}
            label={`${a.role} · ${a.account_id.slice(0, 8)}…`}
            active={selected === a.account_id}
            onClick={() => setSelected(a.account_id)}
          />
        ))}
      </div>

      {selected && <AccountTrades accountId={selected} />}
    </div>
  );
}

function AccountTrades({ accountId }: { accountId: string }) {
  const {
    data: deals,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery(accountTradesQueryOptions(accountId));

  if (isLoading) {
    return (
      <PatientLoader
        label="Pulling your trade history…"
        slowLabel="Still pulling — the source can be slow to respond under load. This is normal; no need to refresh."
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={`Couldn't load trades: ${(error as Error).message}`}
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end text-[11px] text-muted-foreground">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 disabled:opacity-40"
        >
          {isFetching && <Loader2 className="h-3 w-3 animate-spin" />}
          Refresh
        </button>
      </div>
      <TradesTable deals={deals ?? []} />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded border border-primary bg-primary/10 px-2 py-1 text-[11px] text-primary"
          : "rounded border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40"
      }
    >
      {label}
    </button>
  );
}