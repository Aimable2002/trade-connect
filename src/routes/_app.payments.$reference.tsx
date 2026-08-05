import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPayment } from "@/lib/api";
import { formatMoney, METHOD_LABEL } from "@/lib/payments";
import { PatientLoader, ErrorState } from "@/components/DataState";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/payments/$reference")({
  head: () => ({
    meta: [
      { title: "Payment status — CopyDesk" },
      {
        name: "description",
        content: "Track the status of your CopyDesk card or mobile money payment.",
      },
      { property: "og:title", content: "Payment status — CopyDesk" },
      {
        property: "og:description",
        content: "Live status for your CopyDesk wallet top-up or subscription payment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentStatusPage,
});

function PaymentStatusPage() {
  const { reference } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["payments", reference],
    queryFn: () => getPayment(reference),
    // Mobile money approvals land asynchronously via the provider webhook.
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "successful" || s === "failed" || s === "cancelled" ? false : 4000;
    },
  });

  const status = data?.status ?? "pending";
  const done = status === "successful";
  const failed = status === "failed" || status === "cancelled";

  const Icon = done ? CheckCircle2 : failed ? XCircle : Clock;

  return (
    <div className="mx-auto w-full max-w-lg space-y-5 p-4 pb-24 md:p-8">
      <Link
        to="/pricing"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Pricing & wallet
      </Link>

      {isLoading && <PatientLoader label="Checking payment…" />}
      {!!error && <ErrorState message={(error as Error).message} />}

      {data && (
        <section
          className={cn(
            "rounded-xl border p-6 text-center",
            done
              ? "border-profit/40 bg-profit/5"
              : failed
                ? "border-loss/40 bg-loss/5"
                : "border-border bg-card",
          )}
        >
          <Icon
            className={cn(
              "mx-auto h-10 w-10",
              done ? "text-profit" : failed ? "text-loss" : "text-primary",
            )}
          />
          <h1 className="mt-3 text-xl font-semibold tracking-tight">
            {done ? "Payment received" : failed ? "Payment not completed" : "Waiting for payment"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {done
              ? data.credited
                ? "Your balance has been updated."
                : "Funds confirmed — your balance updates in a moment."
              : failed
                ? (data.message ?? "The payment was cancelled or declined. You can try again.")
                : "Approve the prompt on your phone or finish the checkout. This page updates itself."}
          </p>

          <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-left">
            <Cell label="Amount" value={formatMoney(data.amount_charged, data.currency)} />
            <Cell label="In USD" value={`$${data.amount_usd.toFixed(2)}`} />
            <Cell label="Method" value={METHOD_LABEL[data.method] ?? data.method} />
            <Cell label="Reference" value={data.reference} />
          </dl>

          <Link
            to="/pricing"
            className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            {done ? "Back to wallet" : "Cancel and go back"}
          </Link>
        </section>
      )}
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-3 py-2.5">
      <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-xs">{value}</dd>
    </div>
  );
}
