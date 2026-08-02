import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  accountsQueryOptions,
  billingQueryOptions,
  packagesQueryOptions,
  walletQueryOptions,
  walletTxQueryOptions,
  type Package,
} from "@/lib/queries";
import { ApiError, reactivateBilling, selectPackage, topupWallet } from "@/lib/api";
import { NumericValue } from "@/components/NumericValue";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock,
  Info as InfoIcon,
  Package as PackageIcon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { PatientLoader, ErrorState } from "@/components/DataState";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/pricing")({
  head: () => ({
    meta: [
      { title: "Wallet & Packages — CopyDesk" },
      {
        name: "description",
        content:
          "Top up your CopyDesk wallet and activate a copy-trading package for your follower account.",
      },
      { property: "og:title", content: "Wallet & Packages — CopyDesk" },
      {
        property: "og:description",
        content: "Top up your wallet and activate a copy-trading package.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { account?: string } => ({
    account: typeof search.account === "string" ? search.account : undefined,
  }),
  component: Pricing,
});

function Pricing() {
  const { account } = Route.useSearch();
  const navigate = useNavigate();
  const { data: accounts, isLoading, error } = useQuery(accountsQueryOptions());
  const followers = (accounts ?? []).filter((a) => a.role === "follower");
  const selected = followers.find((f) => f.account_id === account);

  if (!account || !selected) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 md:p-8">
        <Header />
        <section className="rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="text-sm font-semibold">Pick a follower account</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Wallet balance and billing are managed per follower account.
          </p>

          {isLoading && <PatientLoader label="Loading accounts…" className="mt-4" />}
          {error && <ErrorState className="mt-4" message={(error as Error).message} />}

          {!isLoading && !error && followers.length === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-xs text-muted-foreground">
                You don't have a follower account yet.
              </p>
              <Link
                to="/onboarding"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground"
              >
                Set one up
              </Link>
            </div>
          )}

          <div className="mt-4 grid gap-2">
            {followers.map((f) => (
              <button
                key={f.account_id}
                onClick={() => navigate({ to: "/pricing", search: { account: f.account_id } })}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 p-3.5 text-left transition-colors active:border-primary/60 hover:border-primary/60"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">{f.account_id}</div>
                  <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    Follower · {f.status}
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <PricingForAccount
      accountId={account}
      accountIds={followers.map((f) => f.account_id)}
      onSwitch={(id) => navigate({ to: "/pricing", search: { account: id } })}
    />
  );
}

function Header() {
  return (
    <header>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Wallet &amp; billing
      </div>
      <h1 className="mt-1 text-2xl font-semibold md:text-3xl">Pricing</h1>
      <p className="mt-1 text-xs text-muted-foreground md:text-sm">
        Top up your wallet, then activate a package to keep copy trading running.
      </p>
    </header>
  );
}

function PricingForAccount({
  accountId,
  accountIds,
  onSwitch,
}: {
  accountId: string;
  accountIds: string[];
  onSwitch: (id: string) => void;
}) {
  const qc = useQueryClient();
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
  } = useQuery(walletQueryOptions(accountId));
  const { data: billing } = useQuery(billingQueryOptions(accountId));
  const {
    data: packages,
    isLoading: pkgLoading,
    error: pkgError,
  } = useQuery(packagesQueryOptions());

  const currentPkg = billing && "package_code" in billing ? billing.package_code : null;
  const billingStatus = billing && "status" in billing ? billing.status : "none";

  const pick = useMutation({
    mutationFn: (code: string) =>
      billingStatus === "closed" && code === currentPkg
        ? reactivateBilling(accountId, code)
        : selectPackage(accountId, code),
    onSuccess: () => {
      toast.success(
        billingStatus === "closed"
          ? "Billing reactivated. You may need to re-provision the account."
          : "Package activated.",
      );
      qc.invalidateQueries({ queryKey: ["accounts", accountId] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const sorted = [...(packages ?? [])].sort(
    (a, b) => a.infra_fee + a.slot_fee_per_slot - (b.infra_fee + b.slot_fee_per_slot),
  );
  const recommendedCode = sorted.length >= 3 ? sorted[1].code : sorted[0]?.code;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Dashboard
        </Link>
        {accountIds.length > 1 && (
          <AccountSwitcher current={accountId} ids={accountIds} onSwitch={onSwitch} />
        )}
      </div>

      <Header />

      <WalletCard
        accountId={accountId}
        wallet={wallet}
        isLoading={walletLoading}
        error={walletError}
      />

      <BillingStatusCard
        billing={billing}
        onReactivate={(code) => pick.mutate(code)}
        reactivating={pick.isPending}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <PackageIcon className="h-3 w-3" /> Packages
        </div>
        {pkgLoading && <PatientLoader label="Loading packages…" />}
        {pkgError && (
          <ErrorState message={`Couldn't load packages: ${(pkgError as Error).message}`} />
        )}
        {!pkgLoading && !pkgError && sorted.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No packages are available right now.
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-3">
          {sorted.map((p) => (
            <PackageCard
              key={p.code}
              pkg={p}
              current={currentPkg === p.code && billingStatus !== "closed"}
              closed={currentPkg === p.code && billingStatus === "closed"}
              recommended={p.code === recommendedCode}
              onSelect={() => pick.mutate(p.code)}
              pending={pick.isPending}
              insufficientFunds={!!wallet && wallet.balance < p.infra_fee + p.slot_fee_per_slot}
            />
          ))}
        </div>
      </section>

      <WalletTransactions accountId={accountId} />
    </div>
  );
}

function AccountSwitcher({
  current,
  ids,
  onSwitch,
}: {
  current: string;
  ids: string[];
  onSwitch: (id: string) => void;
}) {
  return (
    <label className="relative flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5">
      <span className="sr-only">Follower account</span>
      <select
        value={current}
        onChange={(e) => onSwitch(e.target.value)}
        className="max-w-[9rem] appearance-none truncate bg-transparent pr-4 font-mono text-[11px] outline-none"
      >
        {ids.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
    </label>
  );
}

/* ---------------- wallet ---------------- */

const QUICK_AMOUNTS = [25, 50, 100, 250];

function WalletCard({
  accountId,
  wallet,
  isLoading,
  error,
}: {
  accountId: string;
  wallet: { balance: number; in_debt: boolean } | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState<string>("");

  const topup = useMutation({
    mutationFn: (a: number) => topupWallet(accountId, a),
    onSuccess: (w) => {
      toast.success(`Wallet topped up — new balance $${w.balance.toFixed(2)}.`);
      setAmount("");
      qc.invalidateQueries({ queryKey: ["accounts", accountId, "wallet"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const submitAmount = (n: number) => {
    if (!isFinite(n) || n <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    topup.mutate(n);
  };

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card",
        wallet?.in_debt ? "border-loss/40" : "border-border",
      )}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Wallet className="h-3.5 w-3.5" /> Wallet balance
          </div>
          {wallet?.in_debt && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-loss/40 bg-loss/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-loss">
              <ShieldAlert className="h-3 w-3" /> Negative
            </span>
          )}
        </div>

        {isLoading && <PatientLoader label="Loading wallet…" compact className="mt-3" />}
        {!!error && <ErrorState className="mt-3" message={(error as Error).message} />}

        {wallet && (
          <div className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            <NumericValue value={wallet.balance} format="currency" />
          </div>
        )}
      </div>

      {wallet && (
        <div className="border-t border-border bg-background/40 p-4 md:p-5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Top up</div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                onClick={() => submitAmount(v)}
                disabled={topup.isPending}
                className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-3 text-sm font-semibold transition-colors active:border-primary hover:border-primary/60 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5 text-primary" />
                {v}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitAmount(parseFloat(amount));
            }}
            className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min="1"
              step="0.01"
              placeholder="Custom amount"
              className="min-w-0 rounded-lg border border-border bg-input px-3 py-3 font-mono text-sm outline-none focus:border-primary"
            />
            <button
              disabled={topup.isPending || !amount}
              className="shrink-0 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              {topup.isPending ? "Adding…" : "Add"}
            </button>
          </form>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Payments aren't wired up to a processor yet — top-ups are applied to your balance
              directly. Real card/bank payment is coming; this is a manual placeholder so you can
              test billing end-to-end.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function WalletTransactions({ accountId }: { accountId: string }) {
  const { data, isLoading, error } = useQuery(walletTxQueryOptions(accountId));
  const [showAll, setShowAll] = useState(false);

  if (isLoading || error || !data || data.length === 0) return null;

  const sorted = [...data].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const visible = showAll ? sorted.slice(0, 100) : sorted.slice(0, 6);

  const labelFor = (t: string) =>
    ({
      topup: "Top up",
      infra_fee: "Infra fee",
      slot_fee: "Slot fee",
      profit_share_platform: "Platform fee",
      profit_share_master: "Master payout",
      debt_recovery: "Debt recovery",
    })[t] ?? t;

  return (
    <section className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Recent wallet activity
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {visible.map((tx, i) => {
          const credit = tx.amount >= 0;
          return (
            <div
              key={`${tx.created_at}-${i}`}
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-3 text-xs",
                i !== 0 && "border-t border-border",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                {credit ? (
                  <ArrowDownLeft className="h-3.5 w-3.5 shrink-0 text-profit" />
                ) : (
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-loss" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium">{labelFor(tx.type)}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className={cn("shrink-0 font-mono", credit ? "text-profit" : "text-loss")}>
                <NumericValue value={tx.amount} format="signed" flash={false} />
              </div>
            </div>
          );
        })}
      </div>
      {sorted.length > 6 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          {showAll ? "Show less" : `Show more (${Math.min(sorted.length, 100) - 6} more)`}
        </button>
      )}
    </section>
  );
}

/* ---------------- billing status ---------------- */

function BillingStatusCard({
  billing,
  onReactivate,
  reactivating,
}: {
  billing:
    | { status: "none" }
    | {
        status: string;
        package_code: string;
        renews_at?: string | null;
        grace_started_at?: string | null;
      }
    | undefined;
  onReactivate: (code: string) => void;
  reactivating: boolean;
}) {
  const isGrace = !!billing && billing.status === "grace";
  const isClosed = !!billing && billing.status === "closed";

  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 md:p-5",
        isGrace ? "border-warning/40" : isClosed ? "border-loss/40" : "border-border",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Subscription
      </div>

      {(!billing || billing.status === "none") && (
        <p className="mt-2 text-xs text-muted-foreground">
          No active package yet. Pick one below to start copying.
        </p>
      )}

      {billing && billing.status !== "none" && "package_code" in billing && (
        <div className="mt-2 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold uppercase">
              {billing.package_code}
            </span>
            <StatusPillBilling status={billing.status} />
          </div>

          {billing.renews_at && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Renews{" "}
              {new Date(billing.renews_at).toLocaleDateString()}
            </div>
          )}

          {isGrace && (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-2.5 text-[11px] text-warning">
              In grace period — top up your wallet so the next renewal can go through automatically.
            </div>
          )}

          {isClosed && (
            <button
              onClick={() => onReactivate(billing.package_code)}
              disabled={reactivating}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-3 text-xs font-semibold text-primary-foreground disabled:opacity-40 sm:w-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {reactivating ? "Reactivating…" : "Reactivate this package"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function StatusPillBilling({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "text-profit border-profit/40 bg-profit/10",
    grace: "text-warning border-warning/40 bg-warning/10",
    closed: "text-loss border-loss/40 bg-loss/10",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        map[status] ?? "text-muted-foreground border-border bg-muted/30",
      )}
    >
      {status}
    </span>
  );
}

/* ---------------- package cards ---------------- */

function PackageCard({
  pkg,
  current,
  closed,
  recommended,
  onSelect,
  pending,
  insufficientFunds,
}: {
  pkg: Package;
  current: boolean;
  closed: boolean;
  recommended: boolean;
  onSelect: () => void;
  pending: boolean;
  insufficientFunds: boolean;
}) {
  const total = pkg.infra_fee + pkg.slot_fee_per_slot;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-4 transition-colors md:p-5",
        current
          ? "border-primary bg-primary/5"
          : recommended
            ? "border-primary/50 bg-card"
            : "border-border bg-card",
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <div className="truncate font-mono text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {pkg.code}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-3xl font-semibold">
              <NumericValue value={total} format="currency" flash={false} />
            </span>
            <span className="text-[11px] text-muted-foreground">
              / {pkg.duration_days}-day cycle
            </span>
          </div>
        </div>
        {current ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary-foreground">
            <Check className="h-2.5 w-2.5" /> Current
          </span>
        ) : recommended ? (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
            Popular
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
        <Spec label="Roster" value={String(pkg.base_roster_size)} />
        <Spec
          label="Infra"
          value={<NumericValue value={pkg.infra_fee} format="currency" flash={false} />}
        />
        <Spec
          label="Per slot"
          value={<NumericValue value={pkg.slot_fee_per_slot} format="currency" flash={false} />}
        />
      </dl>

      <div className="flex-1" />

      {insufficientFunds && !current && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-warning">
          <ShieldAlert className="h-3 w-3 shrink-0" /> Balance is below the cycle cost
        </div>
      )}

      <button
        onClick={onSelect}
        disabled={pending || (current && !closed)}
        className={cn(
          "mt-3 w-full rounded-lg py-3 text-xs font-semibold disabled:opacity-40",
          current && !closed
            ? "border border-primary/40 bg-primary/10 text-primary"
            : "bg-primary text-primary-foreground",
        )}
      >
        {current && !closed
          ? "Active"
          : closed
            ? pending
              ? "Reactivating…"
              : "Reactivate"
            : pending
              ? "Activating…"
              : "Select package"}
      </button>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-2 py-2.5">
      <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-xs">{value}</dd>
    </div>
  );
}
