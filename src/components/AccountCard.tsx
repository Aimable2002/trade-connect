import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NumericValue } from "./NumericValue";
import { StatusPill } from "./StatusPill";
import { RoleBadge } from "./RoleBadge";
import type { AccountRow, LiveAccountState } from "@/lib/supabase";
import { billingQueryOptions, walletQueryOptions } from "@/lib/queries";
import { AlertTriangle, ChevronRight, Clock } from "lucide-react";

export function AccountCard({
  account,
  live,
}: {
  account: AccountRow;
  live?: LiveAccountState;
}) {
  const isFollower = account.role === "follower";
  const wallet = useQuery({
    ...walletQueryOptions(account.account_id),
    enabled: isFollower,
  });
  const billing = useQuery({
    ...billingQueryOptions(account.account_id),
    enabled: isFollower,
  });

  const balance = live?.balance ?? null;
  const equity = live?.equity ?? null;
  const openPnl =
    balance !== null && equity !== null ? equity - balance : null;

  const inDebt = isFollower && wallet.data?.in_debt === true;
  const inGrace =
    isFollower &&
    billing.data &&
    "status" in billing.data &&
    billing.data.status === "grace";

  return (
    <Link
      to="/accounts/$accountId"
      params={{ accountId: account.account_id }}
      className="group block rounded-lg border border-border bg-card transition-colors hover:border-primary/60"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <RoleBadge role={account.role} />
          <span
            className="truncate font-mono text-xs text-muted-foreground"
            title={account.account_id}
          >
            {account.account_id.slice(0, 8)}…{account.account_id.slice(-4)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={account.status} />
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
        </div>
      </div>

      {(inDebt || inGrace) && (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
          {inDebt && (
            <span className="inline-flex items-center gap-1 rounded border border-loss/40 bg-loss/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-loss">
              <AlertTriangle className="h-3 w-3" />
              Wallet negative
            </span>
          )}
          {inGrace && (
            <span className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning">
              <Clock className="h-3 w-3" />
              Subscription grace
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Balance
          </div>
          <div className="mt-1 text-2xl font-semibold">
            <NumericValue value={balance} format="currency" />
          </div>
        </div>
        <div className="bg-card p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Equity
          </div>
          <div className="mt-1 text-2xl font-semibold">
            <NumericValue value={equity} format="currency" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Open P&amp;L
          </div>
          <div
            className={
              openPnl === null
                ? "mt-1 text-sm text-muted-foreground"
                : openPnl >= 0
                  ? "mt-1 text-sm text-profit"
                  : "mt-1 text-sm text-loss"
            }
          >
            <NumericValue value={openPnl} format="signed" />
          </div>
        </div>
        <div className="bg-card px-4 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Open positions
          </div>
          <div className="mt-1 text-sm">
            <NumericValue
              value={
                Array.isArray(live?.open_positions)
                  ? (live?.open_positions as unknown as unknown[]).length
                  : (live?.open_positions ?? null)
              }
              format="number"
              decimals={0}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
