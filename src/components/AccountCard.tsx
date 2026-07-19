import { NumericValue } from "./NumericValue";
import { StatusPill } from "./StatusPill";
import { RoleBadge } from "./RoleBadge";
import type { AccountRow, LiveAccountState } from "@/lib/supabase";
import { Copy } from "lucide-react";
import { useState } from "react";

export function AccountCard({
  account,
  live,
}: {
  account: AccountRow;
  live?: LiveAccountState;
}) {
  const [copied, setCopied] = useState(false);
  const balance = live?.balance ?? null;
  const equity = live?.equity ?? null;
  const openPnl =
    balance !== null && equity !== null ? equity - balance : null;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <RoleBadge role={account.role} />
          <button
            onClick={() => {
              navigator.clipboard?.writeText(account.account_id);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="flex min-w-0 items-center gap-1 truncate font-mono text-xs text-muted-foreground hover:text-foreground"
            title={account.account_id}
          >
            <span className="truncate">
              {account.account_id.slice(0, 8)}…
              {account.account_id.slice(-4)}
            </span>
            <Copy className="h-3 w-3 shrink-0" />
            {copied && <span className="text-profit">copied</span>}
          </button>
        </div>
        <StatusPill status={account.status} />
      </div>

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
              value={live?.open_positions ?? null}
              format="number"
              decimals={0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
