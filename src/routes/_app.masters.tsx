import { createFileRoute } from "@tanstack/react-router";
import { RiskBadge } from "@/components/RiskBadge";
import { NumericValue } from "@/components/NumericValue";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export const Route = createFileRoute("/_app/masters")({
  component: MastersDirectory,
});

const MASTERS = [
  { id: "m1", name: "Northwind Systematic", return30: 8.4, followers: 214, risk: 4, style: "Systematic FX" },
  { id: "m2", name: "Kite Momentum", return30: 14.2, followers: 91, risk: 7, style: "Index momentum" },
  { id: "m3", name: "Meridian Macro", return30: 5.1, followers: 508, risk: 3, style: "Macro discretionary" },
  { id: "m4", name: "Halcyon Vol", return30: -2.3, followers: 42, risk: 8, style: "Short vol" },
  { id: "m5", name: "Orbit Carry", return30: 3.9, followers: 176, risk: 2, style: "Carry" },
  { id: "m6", name: "Redshift Scalper", return30: 22.7, followers: 63, risk: 9, style: "HFT scalping" },
];

function MastersDirectory() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Directory
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Masters</h1>
      </header>
      <PlaceholderBanner text="Preview data — real directory ships with the master onboarding release." />
      <div className="grid gap-3 md:grid-cols-2">
        {MASTERS.map((m) => (
          <div
            key={m.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {m.style}
                </div>
              </div>
              <RiskBadge risk={m.risk} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded border border-border bg-border">
              <div className="bg-card p-3">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  30d return
                </div>
                <div
                  className={
                    m.return30 >= 0
                      ? "mt-1 text-sm text-profit"
                      : "mt-1 text-sm text-loss"
                  }
                >
                  <NumericValue value={m.return30} format="signed" flash={false} />%
                </div>
              </div>
              <div className="bg-card p-3">
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Followers
                </div>
                <div className="mt-1 text-sm">
                  <NumericValue value={m.followers} decimals={0} flash={false} />
                </div>
              </div>
            </div>
            <button
              disabled
              className="mt-3 w-full cursor-not-allowed rounded-md border border-border bg-muted/40 py-2 text-xs text-muted-foreground"
              title="Copy flow ships with the directory endpoint"
            >
              Copy this master (coming soon)
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
