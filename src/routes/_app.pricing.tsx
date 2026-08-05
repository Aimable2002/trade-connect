import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  accountsQueryOptions,
  billingQueryOptions,
  packagesQueryOptions,
  walletQueryOptions,
  walletTxQueryOptions,
} from "@/lib/queries";
import { ApiError, reactivateBilling, selectPackage } from "@/lib/api";
import {
  breakeven,
  buildTierInsights,
  bundledTopup,
  cycleCost,
  PLATFORM_CUT_PCT,
  tierName,
  tierPitch,
  type TierInsight,
} from "@/lib/pricing";
import { NumericValue } from "@/components/NumericValue";
import { Modal } from "@/components/Modal";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Calculator,
  Check,
  ChevronDown,
  Clock,
  Gift,
  Info as InfoIcon,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
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
          "Top up your CopyDesk wallet and pick a copy-trading commitment — the longer the cycle, the lower the cost per day.",
      },
      { property: "og:title", content: "Wallet & Packages — CopyDesk" },
      {
        property: "og:description",
        content: "Top up your wallet and pick a copy-trading commitment tier.",
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
      <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-4xl">
        Commit longer, pay less per day.
      </h1>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground md:text-sm">
        One wallet per follower account funds everything: your cycle fee, per-slot fees and the
        platform's share of copied profit. Every figure below is read live from your billing
        packages.
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
          : "Package activated — the bundled credit lands in your wallet.",
      );
      qc.invalidateQueries({ queryKey: ["accounts", accountId] });
      setConfirmTier(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const tiers = useMemo(() => buildTierInsights(packages ?? []), [packages]);
  const [confirmTier, setConfirmTier] = useState<TierInsight | null>(null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 pb-24 md:p-8">
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
        tiers={tiers}
        onReactivate={(code) => pick.mutate(code)}
        reactivating={pick.isPending}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Choose a commitment</h2>
          <span className="text-[11px] text-muted-foreground">
            Prices shown per cycle and normalised per day
          </span>
        </div>

        {pkgLoading && <PatientLoader label="Loading packages…" />}
        {pkgError && (
          <ErrorState message={`Couldn't load packages: ${(pkgError as Error).message}`} />
        )}
        {!pkgLoading && !pkgError && tiers.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No packages are available right now.
          </div>
        )}

        <div className="grid gap-2.5">
          {tiers.map((t) => (
            <PackageRow
              key={t.pkg.code}
              tier={t}
              current={currentPkg === t.pkg.code && billingStatus !== "closed"}
              closed={currentPkg === t.pkg.code && billingStatus === "closed"}
              onSelect={() => setConfirmTier(t)}
              pending={pick.isPending}
              insufficientFunds={!!wallet && wallet.balance < cycleCost(t.pkg)}
            />
          ))}
        </div>
      </section>

      <BreakevenCalculator walletBalance={wallet?.balance} />

      <WalletTransactions accountId={accountId} />

      <ConfirmPackageModal
        tier={confirmTier}
        onClose={() => setConfirmTier(null)}
        onConfirm={(code) => pick.mutate(code)}
        pending={pick.isPending}
        isReactivation={confirmTier ? confirmTier.pkg.code === currentPkg && billingStatus === "closed" : false}
      />
    </div>
  );
}

function ConfirmPackageModal({
  tier,
  onClose,
  onConfirm,
  pending,
  isReactivation,
}: {
  tier: TierInsight | null;
  onClose: () => void;
  onConfirm: (code: string) => void;
  pending: boolean;
  isReactivation: boolean;
}) {
  if (!tier) return null;
  const { pkg } = tier;
  const price = cycleCost(pkg);
  const topup = bundledTopup(pkg.code);

  return (
    <Modal open={!!tier} onClose={onClose} title={`Confirm ${tierName(pkg.code)}`}>
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-background/40 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">Subscription price</span>
            <span className="font-mono text-lg font-semibold">
              <NumericValue value={price} format="currency" flash={false} />
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            This is the recurring charge — you'll pay <span className="font-mono text-foreground">${price.toFixed(2)}</span> again
            every {pkg.duration_days}-day cycle for as long as this package renews, deducted from
            your wallet balance.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground">Wallet deposit add-on</span>
            <span className="font-mono text-lg font-semibold">
              {topup !== null ? `$${topup.toFixed(2)}` : "TBC"}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {topup !== null ? (
              <>
                A separate, one-time credit added to your wallet on selection — not part of the
                recurring subscription price above, and not something you'll be charged again.
              </>
            ) : (
              <>This package's bundled wallet credit amount isn't published yet.</>
            )}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-border px-3.5 py-2.5 text-xs font-semibold disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(pkg.code)}
            disabled={pending}
            className="rounded-md bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            {pending ? (isReactivation ? "Reactivating…" : "Confirming…") : isReactivation ? "Reactivate" : "Confirm & activate"}
          </button>
        </div>
      </div>
    </Modal>
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
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>("");

  // Money-in always goes through the hosted checkout (card / mobile money);
  // the wallet is only credited once the processor confirms.
  const submitAmount = (n: number) => {
    if (!isFinite(n) || n <= 0) {
      toast.error("Enter a positive amount.");
      return;
    }
    navigate({
      to: "/checkout",
      search: { accountId, purpose: "wallet_topup" as const, amount: n },
    });
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
                className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card py-3 text-sm font-semibold transition-colors active:border-primary hover:border-primary/60"
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
              disabled={!amount}
              className="shrink-0 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              Continue
            </button>
          </form>

          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Balances are held in USD. On the next screen you pick your currency and pay by card or
              mobile money — you'll see the exact local total before confirming.
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
  tiers,
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
  tiers: TierInsight[];
  onReactivate: (code: string) => void;
  reactivating: boolean;
}) {
  const isGrace = !!billing && billing.status === "grace";
  const isClosed = !!billing && billing.status === "closed";
  const active = billing && billing.status !== "none" && "package_code" in billing ? billing : null;
  const tier = active ? tiers.find((t) => t.pkg.code === active.package_code) : undefined;

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border",
        isGrace
          ? "border-warning/40 bg-warning/[0.04]"
          : isClosed
            ? "border-loss/40 bg-loss/[0.04]"
            : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:p-5">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Current subscription
          </div>
          {!active ? (
            <div className="mt-1.5 text-sm font-semibold">No package yet</div>
          ) : (
            <div className="mt-1.5 flex flex-wrap items-baseline gap-2">
              <span className="text-xl font-semibold tracking-tight">
                {tierName(active.package_code)}
              </span>
              <span className="font-mono text-[11px] uppercase text-muted-foreground">
                {active.package_code}
              </span>
              <StatusPillBilling status={active.status} />
            </div>
          )}
          {!active && (
            <p className="mt-1 text-xs text-muted-foreground">
              Pick a commitment below to start copying.
            </p>
          )}
          {active?.renews_at && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Renews{" "}
              {new Date(active.renews_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {tier && (
          <div className="text-right">
            <div className="font-mono text-lg font-semibold">
              <NumericValue value={cycleCost(tier.pkg)} format="currency" flash={false} />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              per {tier.pkg.duration_days}-day cycle
            </div>
          </div>
        )}
      </div>

      {isGrace && (
        <div className="border-t border-warning/30 px-4 py-3 text-[11px] leading-relaxed text-warning md:px-5">
          Grace period — top up your wallet so the next renewal goes through automatically. Copying
          keeps running until the grace window closes.
        </div>
      )}

      {isClosed && active && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-loss/30 px-4 py-3 md:px-5">
          <span className="text-[11px] leading-relaxed text-loss">
            Billing closed — copying is stopped until you reactivate.
          </span>
          <button
            onClick={() => onReactivate(active.package_code)}
            disabled={reactivating}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {reactivating ? "Reactivating…" : "Reactivate"}
          </button>
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

/* ---------------- package rows ---------------- */

function PackageRow({
  tier,
  current,
  closed,
  onSelect,
  pending,
  insufficientFunds,
}: {
  tier: TierInsight;
  current: boolean;
  closed: boolean;
  onSelect: () => void;
  pending: boolean;
  insufficientFunds: boolean;
}) {
  const { pkg } = tier;
  const total = cycleCost(pkg);
  const pitch = tierPitch(pkg.code);
  const topup = bundledTopup(pkg.code);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors md:p-5",
        current
          ? "border-primary bg-primary/5"
          : tier.recommended
            ? "border-primary/50 bg-card"
            : "border-border bg-card",
      )}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
        {/* identity */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold tracking-tight">{tierName(pkg.code)}</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {pkg.code} · {pkg.duration_days}d
            </span>
            {current && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary-foreground">
                <Check className="h-2.5 w-2.5" /> Current
              </span>
            )}
            {!current && tier.recommended && (
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
                Popular
              </span>
            )}
          </div>
          {pitch && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{pitch}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              Roster <span className="font-mono text-foreground">{pkg.base_roster_size}</span>
            </span>
            {tier.unlocksRoster && tier.rosterDelta > 0 && (
              <span className="text-primary">
                Unlocks {tier.rosterDelta} extra slot{tier.rosterDelta > 1 ? "s" : ""}
              </span>
            )}
            {tier.savingsPct >= 1 && (
              <span className="text-profit">Save {tier.savingsPct.toFixed(0)}% per day</span>
            )}
          </div>
        </div>

        {/* price breakdown */}
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border text-center">
          <Spec
            label="Infra"
            value={<NumericValue value={pkg.infra_fee} format="currency" flash={false} />}
          />
          <Spec
            label="Per slot"
            value={<NumericValue value={pkg.slot_fee_per_slot} format="currency" flash={false} />}
          />
          <Spec label="Per day" value={`$${tier.perDay.toFixed(2)}`} />
        </div>

        {/* price + cta */}
        <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-tight">
              <NumericValue value={total} format="currency" flash={false} />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              ≈ ${tier.perMonth.toFixed(2)}/mo
            </div>
          </div>
          <button
            onClick={onSelect}
            disabled={pending || (current && !closed)}
            className={cn(
              "shrink-0 rounded-lg px-5 py-3 text-xs font-semibold disabled:opacity-40 md:w-40",
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
                  : "Select"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Gift className="h-3.5 w-3.5 text-primary" />
          {topup !== null ? (
            <>
              Includes a <span className="font-mono text-foreground">${topup.toFixed(2)}</span>{" "}
              wallet credit on selection
            </>
          ) : (
            <>Selecting or switching bundles a wallet credit — amount announced at launch</>
          )}
        </span>
        {insufficientFunds && !current && (
          <span className="inline-flex items-center gap-1.5 text-warning">
            <ShieldAlert className="h-3 w-3 shrink-0" /> Balance is below the cycle cost
          </span>
        )}
      </div>
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

/* ---------------- breakeven calculator ---------------- */
/* Standalone - answers one question, independent of any package: "if I add
   $X to my wallet, that $X is what the platform's 20% cut has to consume -
   so how much copied profit has to run through before that happens?"
   Not gated behind package selection or a bundled-topup value. */

function BreakevenCalculator({ walletBalance }: { walletBalance: number | undefined }) {
  const [topupInput, setTopupInput] = useState("");
  const [capitalInput, setCapitalInput] = useState("");

  const topup = parseFloat(topupInput);
  const topupValue = isFinite(topup) && topup > 0 ? topup : null;
  const capital = parseFloat(capitalInput);
  const capitalValue = isFinite(capital) && capital > 0 ? capital : 0;
  const result = breakeven(topupValue, capitalValue);

  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Calculator className="h-3.5 w-3.5" /> Wallet breakeven
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Whatever you add to your wallet, the platform only takes {PLATFORM_CUT_PCT}% of copied
        profit — never a cut of your capital. This shows how much profit needs to run through
        before that {PLATFORM_CUT_PCT}% cut has consumed the amount you added.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Wallet top-up amount</span>
          <input
            value={topupInput}
            onChange={(e) => setTopupInput(e.target.value)}
            type="number"
            min="0"
            step="10"
            placeholder={
              walletBalance !== undefined ? `e.g. ${walletBalance.toFixed(0)}` : "e.g. 100"
            }
            className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-3 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-muted-foreground">Your MT5 capital (optional)</span>
          <input
            value={capitalInput}
            onChange={(e) => setCapitalInput(e.target.value)}
            type="number"
            min="0"
            step="100"
            placeholder="e.g. 5000"
            className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-3 font-mono text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3.5">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" /> Profit needed to consume that top-up
        </div>
        <div className="mt-1.5 font-mono text-2xl font-semibold">
          {result.profitToBreakeven !== null ? `$${result.profitToBreakeven.toFixed(2)}` : "—"}
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {result.topup !== null ? (
            <>
              Add <span className="font-mono text-foreground">${result.topup.toFixed(2)}</span> to
              your wallet, and the {PLATFORM_CUT_PCT}% platform cut only finishes eating into it
              after your copied trades net{" "}
              <span className="font-mono text-foreground">
                ${result.profitToBreakeven?.toFixed(2)}
              </span>{" "}
              of profit
              {result.returnPctToBreakeven !== null && (
                <> — a {result.returnPctToBreakeven.toFixed(1)}% return on your stated capital</>
              )}
              .
            </>
          ) : (
            <>Enter a top-up amount above to see how much profit it takes to consume it.</>
          )}
        </p>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Illustrative only. This is separate from any package's subscription price — copied results
        vary by master, sizing mode and broker execution, and nothing here is a projection of your
        returns.
      </p>
    </section>
  );
}
