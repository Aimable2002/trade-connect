import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  mastersDirectoryQueryOptions,
  masterTradesQueryOptions,
  subscriptionsQueryOptions,
} from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import {
  avgLoss,
  avgWin,
  computeReturnAbs,
  countClosed,
  maxDrawdownAbs,
  profitFactor,
  returnDrawdownRatio,
  netPnl,
  trackRecordDays,
  winRate,
} from "@/lib/trades";
import type { Deal } from "@/lib/api";
import { useMemo } from "react";
import { PatientLoader, ErrorState } from "@/components/DataState";

export const Route = createFileRoute("/_app/leaderboard")({
  component: Leaderboard,
});

interface Row {
  account_id: string;
  name: string;
  rate: number | null;
  ret30: number | null;
  pnl: number | null;
  dd: number | null;
  pf: number | null;
  rdd: number | null;
  aw: number | null;
  al: number | null;
  wr30: number | null;
  closes30: number | null;
  track: number | null;
  followers: number | null;
  loading: boolean;
  error: boolean;
}

function Leaderboard() {
  const {
    data: masters,
    isLoading: dirLoading,
    error: dirError,
    refetch: refetchDir,
  } = useQuery(mastersDirectoryQueryOptions());
  const { data: subs } = useQuery(subscriptionsQueryOptions());

  const tradeResults = useQueries({
    queries: (masters ?? []).map((m) => masterTradesQueryOptions(m.account_id)),
  });

  const rows: Row[] = useMemo(() => {
    return (masters ?? []).map((m, i) => {
      const r = tradeResults[i];
      const deals = (r?.data ?? null) as Deal[] | null;
      const followers = subs
        ? subs.filter((s) => s.master_account_id === m.account_id).length
        : null;
      return {
        account_id: m.account_id,
        name: m.display_name,
        rate: m.rate_percent ?? null,
        ret30: deals ? computeReturnAbs(deals, 30) : null,
        pnl: deals ? netPnl(deals) : null,
        dd: deals ? maxDrawdownAbs(deals) : null,
        pf: deals ? profitFactor(deals) : null,
        rdd: deals ? returnDrawdownRatio(deals) : null,
        aw: deals ? avgWin(deals) : null,
        al: deals ? avgLoss(deals) : null,
        wr30: deals ? winRate(deals, 30) : null,
        closes30: deals ? countClosed(deals, 30) : null,
        track: deals ? trackRecordDays(deals) : null,
        followers,
        loading: !!r?.isLoading,
        error: !!r?.error,
      };
    });
  }, [masters, tradeResults, subs]);

  const ranked = useMemo(() => {
    const withData = rows.filter((r) => r.pnl !== null);
    const withoutData = rows.filter((r) => r.pnl === null);
    withData.sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
    return [...withData, ...withoutData];
  }, [rows]);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Ranked</div>
        <h1 className="mt-1 text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Ranked by all-time net P&L computed client-side from raw MT5 deals. First load per master
          takes ~10s. Scroll horizontally on mobile.
        </p>
      </header>

      {dirLoading && <PatientLoader label="Loading directory…" />}
      {dirError && (
        <ErrorState
          message={`Couldn't load directory: ${(dirError as Error).message}`}
          onRetry={() => refetchDir()}
        />
      )}
      {!dirLoading && !dirError && ranked.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No public masters yet.
        </div>
      )}

      {ranked.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Master</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">Net P&amp;L</th>
                <th className="px-3 py-2 text-right">30d P&amp;L</th>
                <th className="px-3 py-2 text-right">Max DD</th>
                <th className="px-3 py-2 text-right">PF</th>
                <th className="px-3 py-2 text-right">Ret/DD</th>
                <th className="px-3 py-2 text-right">Avg win</th>
                <th className="px-3 py-2 text-right">Avg loss</th>
                <th className="px-3 py-2 text-right">Win %</th>
                <th className="px-3 py-2 text-right">Trades</th>
                <th className="px-3 py-2 text-right">Track</th>
                <th className="px-3 py-2 text-right">Followers</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={r.account_id} className="border-t border-border">
                  <td className="px-3 py-3 font-mono tabular text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      to="/insight/$accountId"
                      params={{ accountId: r.account_id }}
                      className="block truncate text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                      {r.account_id}
                    </div>
                  </td>
                  <Num>{r.rate === null ? "—" : `${r.rate}%`}</Num>
                  <Cell row={r}>
                    {r.pnl === null ? (
                      "—"
                    ) : (
                      <span className={r.pnl >= 0 ? "text-profit" : "text-loss"}>
                        <NumericValue value={r.pnl} format="signed" flash={false} />
                      </span>
                    )}
                  </Cell>
                  <Cell row={r}>
                    {r.ret30 === null ? (
                      "—"
                    ) : (
                      <span className={r.ret30 >= 0 ? "text-profit" : "text-loss"}>
                        <NumericValue value={r.ret30} format="signed" flash={false} />
                      </span>
                    )}
                  </Cell>
                  <Cell row={r}>
                    {r.dd === null ? "—" : <NumericValue value={r.dd} flash={false} />}
                  </Cell>
                  <Cell row={r}>
                    {r.pf === null ? "—" : r.pf === Infinity ? "∞" : r.pf.toFixed(2)}
                  </Cell>
                  <Cell row={r}>
                    {r.rdd === null ? "—" : r.rdd === Infinity ? "∞" : r.rdd.toFixed(2)}
                  </Cell>
                  <Cell row={r}>
                    {r.aw === null ? "—" : <NumericValue value={r.aw} flash={false} />}
                  </Cell>
                  <Cell row={r}>
                    {r.al === null ? "—" : <NumericValue value={r.al} flash={false} />}
                  </Cell>
                  <Cell row={r}>
                    {r.wr30 === null ? (
                      "—"
                    ) : (
                      <>
                        <NumericValue value={r.wr30 * 100} decimals={0} flash={false} />%
                      </>
                    )}
                  </Cell>
                  <Cell row={r}>
                    {r.closes30 === null ? (
                      "—"
                    ) : (
                      <NumericValue value={r.closes30} decimals={0} flash={false} />
                    )}
                  </Cell>
                  <Cell row={r}>{r.track === null ? "—" : `${r.track}d`}</Cell>
                  <Num>{r.followers ?? "—"}</Num>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Cell({ row, children }: { row: Row; children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular">
      {row.loading ? (
        <span className="text-muted-foreground/60">…</span>
      ) : row.error ? (
        <span className="text-xs text-loss">err</span>
      ) : (
        children
      )}
    </td>
  );
}

function Num({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular">{children}</td>;
}

