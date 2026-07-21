import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import {
  accountsQueryOptions,
  billingQueryOptions,
  packagesQueryOptions,
  walletQueryOptions,
} from "@/lib/queries";
import {
  ApiError,
  selectPackage,
  topupWallet,
  type Package,
} from "@/lib/api";
import { NumericValue } from "@/components/NumericValue";
import { toast } from "sonner";
import { Wallet, Package as PackageIcon } from "lucide-react";

const searchSchema = z.object({
  account: z.string().optional(),
});

export const Route = createFileRoute("/_app/pricing")({
  validateSearch: zodValidator(searchSchema),
  component: Pricing,
});

function Pricing() {
  const { account } = Route.useSearch();
  const navigate = useNavigate();
  const { data: accounts } = useQuery(accountsQueryOptions());
  const followers = (accounts ?? []).filter((a) => a.role === "follower");

  if (!account) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
        <Header />
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="text-sm font-semibold">Pick a follower account</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Wallet balance and package selection are per-account.
          </p>
          <div className="mt-3 grid gap-2">
            {followers.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No follower accounts yet — provision one from Onboarding.
              </div>
            )}
            {followers.map((f) => (
              <button
                key={f.account_id}
                onClick={() =>
                  navigate({
                    to: "/pricing",
                    search: { account: f.account_id },
                  })
                }
                className="rounded-md border border-border bg-card p-3 text-left font-mono text-xs hover:border-primary/60"
              >
                {f.account_id}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return <PricingForAccount accountId={account} />;
}

function Header() {
  return (
    <header>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Wallet & Packages
      </div>
      <h1 className="mt-1 text-2xl font-semibold">Pricing</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        Top up your wallet then activate a package to start copying.
      </p>
    </header>
  );
}

function PricingForAccount({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const { data: wallet } = useQuery(walletQueryOptions(accountId));
  const { data: billing } = useQuery(billingQueryOptions(accountId));
  const {
    data: packages,
    isLoading: pkgLoading,
    error: pkgError,
  } = useQuery(packagesQueryOptions());
  const [amount, setAmount] = useState("50");

  const topup = useMutation({
    mutationFn: (a: number) => topupWallet(accountId, a),
    onSuccess: () => {
      toast.success("Wallet topped up.");
      qc.invalidateQueries({ queryKey: ["accounts", accountId] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const pick = useMutation({
    mutationFn: (code: string) => selectPackage(accountId, code),
    onSuccess: () => {
      toast.success("Package activated.");
      qc.invalidateQueries({ queryKey: ["accounts", accountId] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const currentPkg =
    billing && "package_code" in billing ? billing.package_code : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <Header />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Wallet className="h-3 w-3" /> Wallet · {accountId}
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div className="text-3xl font-semibold">
            <NumericValue value={wallet?.balance ?? null} format="currency" />
          </div>
          {wallet?.in_debt && (
            <span className="rounded border border-loss/40 bg-loss/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-loss">
              Wallet negative
            </span>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = parseFloat(amount);
            if (!isFinite(n) || n <= 0) {
              toast.error("Enter a positive amount.");
              return;
            }
            topup.mutate(n);
          }}
          className="mt-4 flex gap-2"
        >
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="1"
            step="0.01"
            className="flex-1 rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
          />
          <button
            disabled={topup.isPending}
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            {topup.isPending ? "Adding…" : "Top up"}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <PackageIcon className="h-3 w-3" /> Active packages
        </div>
        {pkgLoading && (
          <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
            Loading packages…
          </div>
        )}
        {pkgError && (
          <div className="rounded-lg border border-loss/30 bg-loss/5 p-4 text-xs text-loss">
            Couldn't load packages: {(pkgError as Error).message}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(packages ?? []).map((p) => (
            <PackageCard
              key={p.code}
              pkg={p}
              current={currentPkg === p.code}
              onSelect={() => pick.mutate(p.code)}
              pending={pick.isPending}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function PackageCard({
  pkg,
  current,
  onSelect,
  pending,
}: {
  pkg: Package;
  current: boolean;
  onSelect: () => void;
  pending: boolean;
}) {
  return (
    <div
      className={
        current
          ? "rounded-lg border border-primary bg-primary/5 p-4"
          : "rounded-lg border border-border bg-card p-4"
      }
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm font-semibold uppercase">
          {pkg.code}
        </div>
        {current && (
          <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
            Current
          </span>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="text-right font-mono">{pkg.duration_days}d</dd>
        <dt className="text-muted-foreground">Infra fee</dt>
        <dd className="text-right font-mono">
          <NumericValue value={pkg.infra_fee} format="currency" flash={false} />
        </dd>
        <dt className="text-muted-foreground">Slot fee</dt>
        <dd className="text-right font-mono">
          <NumericValue
            value={pkg.slot_fee_per_slot}
            format="currency"
            flash={false}
          />
        </dd>
        <dt className="text-muted-foreground">Roster</dt>
        <dd className="text-right font-mono">{pkg.base_roster_size}</dd>
      </dl>
      <button
        onClick={onSelect}
        disabled={pending || current}
        className="mt-4 w-full rounded-md bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
      >
        {current ? "Active" : pending ? "Activating…" : "Select package"}
      </button>
    </div>
  );
}
