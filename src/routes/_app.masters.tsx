import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  accountsQueryOptions,
  mastersDirectoryQueryOptions,
  masterTradesQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { computeReturnAbs, countClosed, winRate } from "@/lib/trades";
import type { DirectoryMaster } from "@/lib/api";

export const Route = createFileRoute("/_app/masters")({
  component: MastersDirectory,
});

function MastersDirectory() {
  const { data: masters, isLoading, error } = useQuery(
    mastersDirectoryQueryOptions(),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Directory
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Masters</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Stats are computed live from each master's raw MT5 deals. First load
          per master takes ~10s while the terminal pulls history.
        </p>
      </header>

      {isLoading && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Loading directory…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-xs text-loss">
          Couldn't load directory: {(error as Error).message}
        </div>
      )}
      {!isLoading && !error && (masters ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No public masters yet. If you're a master, publish your profile from
          Settings.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(masters ?? []).map((m) => (
          <MasterCard key={m.account_id} master={m} />
        ))}
      </div>
    </div>
  );
}

function MasterCard({ master }: { master: DirectoryMaster }) {
  const navigate = useNavigate();
  const { data: accounts } = useQuery(accountsQueryOptions());
  const isMine = (accounts ?? []).some(
    (a) => a.account_id === master.account_id,
  );

  const { data: deals, isLoading, error } = useQuery(
    masterTradesQueryOptions(master.account_id),
  );

  const ret30 = deals ? computeReturnAbs(deals, 30) : null;
  const closes30 = deals ? countClosed(deals, 30) : null;
  const wr30 = deals ? winRate(deals, 30) : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {master.display_name}
          </div>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {master.account_id}
          </div>
        </div>
        {isMine && (
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
            You
          </span>
        )}
      </div>

      {master.bio && (
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">
          {master.bio}
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border">
        <Stat
          label="30d P&L"
          loading={isLoading}
          error={!!error}
          value={
            ret30 === null ? (
              "—"
            ) : (
              <span className={ret30 >= 0 ? "text-profit" : "text-loss"}>
                <NumericValue value={ret30} format="signed" flash={false} />
              </span>
            )
          }
        />
        <Stat
          label="30d trades"
          loading={isLoading}
          error={!!error}
          value={
            closes30 === null ? (
              "—"
            ) : (
              <NumericValue value={closes30} decimals={0} flash={false} />
            )
          }
        />
        <Stat
          label="30d win%"
          loading={isLoading}
          error={!!error}
          value={
            wr30 === null ? (
              "—"
            ) : (
              <NumericValue value={wr30 * 100} decimals={0} flash={false} />
            )
          }
        />
      </div>

      {error && (
        <div className="mt-2 text-[10px] text-loss">
          Couldn't load trades: {(error as Error).message}
        </div>
      )}

      <button
        onClick={() =>
          navigate({
            to: "/onboarding",
            search: { master: master.account_id } as never,
          })
        }
        className="mt-3 w-full rounded-md border border-primary/40 bg-primary/10 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
      >
        Copy this master
      </button>
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  error,
}: {
  label: string;
  value: React.ReactNode;
  loading: boolean;
  error: boolean;
}) {
  return (
    <div className="bg-card p-3">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">
        {loading ? (
          <span className="text-muted-foreground/60">…</span>
        ) : error ? (
          <span className="text-loss">err</span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
// keep useQueries import satisfied by referencing it (tree-shake if unused)
void useQueries;
