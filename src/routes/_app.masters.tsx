import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  accountsQueryOptions,
  mastersDirectoryQueryOptions,
  masterTradesQueryOptions,
  subscriptionsQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { maxDrawdownAbs, netPnl, openExposure, winRate } from "@/lib/trades";
import type { DirectoryMaster } from "@/lib/api";
import { PatientLoader, ErrorState } from "@/components/DataState";

export const Route = createFileRoute("/_app/masters")({
  component: MastersDirectory,
});

function MastersDirectory() {
  const { data: masters, isLoading, error, refetch } = useQuery(mastersDirectoryQueryOptions());

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Directory</div>
        <h1 className="mt-1 text-2xl font-semibold">Masters</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Stats computed live from each master's MT5 deals. First load ~10s.
        </p>
      </header>

      {isLoading && <PatientLoader label="Loading directory…" />}
      {error && (
        <ErrorState
          message={`Couldn't load directory: ${(error as Error).message}`}
          onRetry={() => refetch()}
        />
      )}
      {!isLoading && !error && (masters ?? []).length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No public masters yet.
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
  const { data: subs } = useQuery(subscriptionsQueryOptions());
  const isMine = (accounts ?? []).some((a) => a.account_id === master.account_id);

  const { data: deals, isLoading, error } = useQuery(masterTradesQueryOptions(master.account_id));

  // A master whose deal history can't be read (or is empty) has nothing
  // meaningful to compare against, so the card is hidden rather than shown
  // as a wall of "err" / "—".
  if (error || (deals && deals.length === 0)) return null;

  const pnl = deals ? netPnl(deals) : null;

  const dd = deals ? maxDrawdownAbs(deals) : null;
  const exp = deals ? openExposure(deals) : null;
  const wr = deals ? winRate(deals, 30) : null;
  const followers = subs
    ? subs.filter((s) => s.master_account_id === master.account_id).length
    : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to="/insight/$accountId"
            params={{ accountId: master.account_id }}
            className="block truncate text-sm font-semibold text-primary hover:underline"
          >
            {master.display_name}
          </Link>
          <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {master.account_id}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {master.rate_percent !== undefined && (
            <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]">
              {master.rate_percent}% rate
            </span>
          )}
          {isMine && (
            <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
              You
            </span>
          )}
        </div>
      </div>

      {master.bio && (
        <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{master.bio}</p>
      )}

      <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded border border-border bg-border">
        <Stat
          label="Net P&L"
          loading={isLoading}
          error={!!error}
          value={
            pnl === null ? (
              "—"
            ) : (
              <span className={pnl >= 0 ? "text-profit" : "text-loss"}>
                <NumericValue value={pnl} format="signed" flash={false} />
              </span>
            )
          }
        />
        <Stat
          label="Max DD"
          loading={isLoading}
          error={!!error}
          value={dd === null ? "—" : <NumericValue value={dd} flash={false} />}
        />
        <Stat
          label="Open exp"
          loading={isLoading}
          error={!!error}
          value={exp === null ? "—" : `${exp.toFixed(2)}`}
        />
        <Stat
          label="30d win"
          loading={isLoading}
          error={!!error}
          value={
            wr === null ? (
              "—"
            ) : (
              <>
                <NumericValue value={wr * 100} decimals={0} flash={false} />%
              </>
            )
          }
        />
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        Followers: <span className="font-mono">{followers ?? "—"}</span>
      </div>




      <div className="mt-3 flex gap-2">
        <Link
          to="/insight/$accountId"
          params={{ accountId: master.account_id }}
          className="flex-1 rounded-md border border-border py-2 text-center text-xs font-semibold hover:border-primary/60"
        >
          View insights
        </Link>
        <button
          onClick={() =>
            navigate({
              to: "/onboarding",
              search: { master: master.account_id },
            })
          }
          className="flex-1 rounded-md border border-primary/40 bg-primary/10 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
        >
          Copy master
        </button>
      </div>
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
    <div className="bg-card p-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-xs">
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

