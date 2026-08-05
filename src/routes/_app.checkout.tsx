import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ApiError,
  createPayment,
  getPaymentCurrencies,
  type PaymentCurrency,
  type PaymentMethod,
  type PaymentPurpose,
} from "@/lib/api";
import {
  FALLBACK_CURRENCIES,
  METHOD_LABEL,
  MOBILE_NETWORKS,
  convert,
  formatMoney,
  methodsFor,
} from "@/lib/payments";
import { packagesQueryOptions } from "@/lib/queries";
import { cycleCost, tierName } from "@/lib/pricing";
import { PatientLoader } from "@/components/DataState";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  Lock,
  Smartphone,
} from "lucide-react";

interface CheckoutSearch {
  accountId: string;
  purpose: PaymentPurpose;
  amount?: number;
  pkg?: string;
}

export const Route = createFileRoute("/_app/checkout")({
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => ({
    accountId: String(search["accountId"] ?? ""),
    purpose: search["purpose"] === "package" ? "package" : "wallet_topup",
    amount: search["amount"] !== undefined ? Number(search["amount"]) : undefined,
    pkg: search["pkg"] !== undefined ? String(search["pkg"]) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Checkout — CopyDesk" },
      {
        name: "description",
        content:
          "Pay with card or mobile money. Prices are in USD; see the exact amount in your local currency before you confirm.",
      },
      { property: "og:title", content: "Checkout — CopyDesk" },
      {
        property: "og:description",
        content: "Card and mobile money payments for CopyDesk wallet top-ups and packages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CheckoutPage,
});

const METHOD_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  mobilemoney: Smartphone,
  banktransfer: Landmark,
};

function CheckoutPage() {
  const { accountId, purpose, amount, pkg } = Route.useSearch();
  const navigate = useNavigate();

  const { data: packages } = useQuery(packagesQueryOptions());

  // Currency catalogue is a backend concern; until it answers we still let the
  // payer choose from a known Flutterwave-supported list rather than blocking.
  const { data: currencies, isLoading: curLoading } = useQuery({
    queryKey: ["payments", "currencies"],
    queryFn: getPaymentCurrencies,
    staleTime: 10 * 60_000,
    retry: false,
  });

  const list: PaymentCurrency[] =
    currencies && currencies.length > 0 ? currencies : FALLBACK_CURRENCIES;

  const [currencyCode, setCurrencyCode] = useState("USD");
  const currency = list.find((c) => c.code === currencyCode) ?? list[0];

  const available = methodsFor(currency);
  const [method, setMethod] = useState<PaymentMethod>("card");
  useEffect(() => {
    if (!available.includes(method)) setMethod(available[0]);
  }, [available, method]);

  const networks = MOBILE_NETWORKS[currencyCode] ?? [];
  const [network, setNetwork] = useState<string>("");
  useEffect(() => {
    setNetwork(networks[0] ?? "");
  }, [currencyCode]); // eslint-disable-line react-hooks/exhaustive-deps
  const [phone, setPhone] = useState("");

  const selectedPackage = useMemo(
    () => (packages ?? []).find((p) => p.code === pkg),
    [packages, pkg],
  );

  const amountUsd =
    purpose === "package"
      ? selectedPackage
        ? cycleCost(selectedPackage)
        : (amount ?? 0)
      : (amount ?? 0);

  const converted = convert(amountUsd, currency);

  const pay = useMutation({
    mutationFn: () =>
      createPayment({
        account_id: accountId,
        purpose,
        amount_usd: amountUsd,
        package_code: purpose === "package" ? pkg : undefined,
        currency: currencyCode,
        method,
        phone_number: method === "mobilemoney" ? phone : undefined,
        network: method === "mobilemoney" ? network : undefined,
        redirect_url:
          typeof window !== "undefined" ? `${window.location.origin}/payments/status` : "",
      }),
    onSuccess: (intent) => {
      if (intent.checkout_url) {
        window.location.href = intent.checkout_url;
        return;
      }
      navigate({ to: "/payments/$reference", params: { reference: intent.reference } });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const invalid =
    !accountId || amountUsd <= 0 || (method === "mobilemoney" && phone.trim().length < 8);

  const title =
    purpose === "package" ? `${pkg ? tierName(pkg) : "Package"} subscription` : "Wallet top-up";

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 p-4 pb-32 md:p-8">
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to pricing
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {title} · <span className="font-mono">{accountId || "no account"}</span>
        </p>
      </header>

      {/* ---- amount summary ---- */}
      <section className="overflow-hidden rounded-xl border border-primary/40 bg-primary/5">
        <div className="p-5">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            You are paying
          </div>
          <div className="mt-1 text-4xl font-semibold tracking-tight">
            {converted !== null ? formatMoney(converted, currencyCode) : `$${amountUsd.toFixed(2)}`}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            {converted !== null && currencyCode !== "USD" ? (
              <>
                ${amountUsd.toFixed(2)} USD
                {currency?.rate_per_usd
                  ? ` · 1 USD = ${formatMoney(currency.rate_per_usd, currencyCode)}`
                  : null}
              </>
            ) : currencyCode === "USD" ? (
              "Priced in USD"
            ) : (
              `$${amountUsd.toFixed(2)} USD · exact ${currencyCode} amount confirmed at checkout`
            )}
          </div>
        </div>
      </section>

      {/* ---- currency ---- */}
      <section className="rounded-xl border border-border bg-card p-4">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Pay in
        </label>
        <div className="relative mt-2">
          <select
            value={currencyCode}
            onChange={(e) => setCurrencyCode(e.target.value)}
            className="w-full appearance-none rounded-lg border border-border bg-input px-3 py-3 text-sm outline-none focus:border-primary"
          >
            {list.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        {curLoading && <PatientLoader label="Loading live rates…" compact className="mt-3" />}
      </section>

      {/* ---- method ---- */}
      <section className="rounded-xl border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Payment method
        </div>
        <div className="mt-2 grid gap-2">
          {available.map((m) => {
            const Icon = METHOD_ICON[m];
            const active = method === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                  active ? "border-primary bg-primary/10" : "border-border bg-background/40",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")}
                />
                <span className="flex-1 text-sm font-semibold">{METHOD_LABEL[m]}</span>
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        {method === "mobilemoney" && (
          <div className="mt-3 space-y-2">
            {networks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {networks.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNetwork(n)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide",
                      network === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="Mobile money number (e.g. 2507xxxxxxx)"
              className="w-full rounded-lg border border-border bg-input px-3 py-3 font-mono text-sm outline-none focus:border-primary"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              You'll get a prompt on this number to approve the payment.
            </p>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Payments are processed by Flutterwave. CopyDesk never sees or stores your card or mobile
        money credentials.
      </p>

      {/* ---- sticky CTA ---- */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-4 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</div>
            <div className="truncate font-mono text-sm">
              {converted !== null
                ? formatMoney(converted, currencyCode)
                : `$${amountUsd.toFixed(2)}`}
            </div>
          </div>
          <button
            onClick={() => pay.mutate()}
            disabled={invalid || pay.isPending}
            className="shrink-0 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            {pay.isPending ? "Starting…" : "Pay now"}
          </button>
        </div>
      </div>
    </div>
  );
}
