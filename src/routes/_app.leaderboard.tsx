import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { mastersDirectoryQueryOptions, masterTradesQueryOptions } from "@/lib/queries";
import { NumericValue } from "@/components/NumericValue";
import { computeReturnAbs, countClosed, winRate } from "@/lib/trades";
import type { Deal } from "@/lib/api";
import { useMemo } from "react";

export const Route = createFileRoute("/_app/leaderboard")({
  component: Leaderboard,
});

interface Row {
  account_id: string;
  name: string;
  ret30: number | null;
  closes30: number | null;
  wr30: number | null;
  loading: boolean;
  error: boolean;
}

function Leaderboard() {
  const { data: masters, isLoading: dirLoading, error: dirError } = useQuery(
    mastersDirectoryQueryOptions(),
  );

  const tradeResults = useQueries({
    queries: (masters ?? []).map((m) => masterTradesQueryOptions(m.account_id)),
  });

  const rows: Row[] = useMemo(() => {
    return (masters ?? []).map((m, i) => {
      const r = tradeResults[i];
      const deals = (r?.data ?? null) as Deal[] | null;
      return {
        account_id: m.account_id,
        name: m.display_name,
        ret30: deals ? computeReturnAbs(deals, 30) : null,
        closes30: deals ? countClosed(deals, 30) : null,
        wr30: deals ? winRate(deals, 30) : null,
        loading: !!r?.isLoading,
        error: !!r?.error,
      };
    });
  }, [masters, tradeResults]);

  const ranked = useMemo(() => {
    const withData = rows.filter((r) => r.ret30 !== null);
    const withoutData = rows.filter((r) => r.ret30 === null);
    withData.sort((a, b) => (b.ret30 ?? 0) - (a.ret30 ?? 0));
    return [...withData, ...withoutData];
  }, [rows]);
  console.log("ranked masters :", ranked)
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Ranked
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Ranked by 30-day realized P&amp;L computed from raw MT5 deals.
          First load per master takes ~10s.
        </p>
      </header>

      {dirLoading && (
        <div className="rounded-lg border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          Loading directory…
        </div>
      )}
      {dirError && (
        <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-xs text-loss">
          Couldn't load directory: {(dirError as Error).message}
        </div>
      )}
      {!dirLoading && !dirError && ranked.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No public masters yet.
        </div>
      )}

      {ranked.length > 0 && (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Master</th>
                  <th className="px-4 py-2 text-right">30d P&amp;L</th>
                  <th className="px-4 py-2 text-right">30d trades</th>
                  <th className="px-4 py-2 text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr key={r.account_id} className="border-t border-border">
                    <td className="px-4 py-3 font-mono tabular text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="truncate">{r.name}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {r.account_id}
                      </div>
                    </td>
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
                      {r.closes30 === null ? (
                        "—"
                      ) : (
                        <NumericValue value={r.closes30} decimals={0} flash={false} />
                      )}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 md:hidden">
            {ranked.map((r, i) => (
              <div
                key={r.account_id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <div className="w-6 shrink-0 font-mono tabular text-sm text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    {r.loading ? (
                      <span>loading…</span>
                    ) : r.error ? (
                      <span className="text-loss">error</span>
                    ) : (
                      <>
                        <span className={r.ret30! >= 0 ? "text-profit" : "text-loss"}>
                          <NumericValue value={r.ret30!} format="signed" flash={false} />
                        </span>
                        <span>· {r.closes30} trades</span>
                        <span>· {Math.round((r.wr30 ?? 0) * 100)}%</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Cell({ row, children }: { row: Row; children: React.ReactNode }) {
  return (
    <td className="px-4 py-3 text-right font-mono tabular">
      {row.loading ? (
        <span className="text-muted-foreground/60">…</span>
      ) : row.error ? (
        <span className="text-loss text-xs">err</span>
      ) : (
        children
      )}
    </td>
  );
}
