import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  formatLatency,
  publicMastersQueryOptions,
  publicStatsQueryOptions,
} from "@/lib/public-stats";
import {
  Activity,
  ArrowRight,
  Cable,
  Gauge,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4 animate-pulse text-primary" />
          <span className="font-mono text-xs tracking-widest">LOADING</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Features />
      <Brokers />
      <TopMasters />
      <PricingPreview />

      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------------- nav ---------------- */

function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-bold tracking-widest">COPYDESK</span>
        </div>
        <nav className="hidden items-center gap-6 text-xs text-muted-foreground md:flex">
          <a href="#how-it-works" className="hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- hero ---------------- */

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-16 md:px-8 md:pb-24 md:pt-24">
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Copy trading, done right
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Copy live trades from vetted masters — in real time, on your own MT5 broker account.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
            CopyDesk mirrors a master's fills into your MetaTrader 5 account as they happen —
            whether the master runs on MT5 or cTrader. Full transparency on balance, equity, and
            open positions — you always control your own broker login.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
            >
              Start copy trading <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-5 py-3 text-sm font-medium hover:border-primary/50"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            No managed API vendor in the execution path. Your credentials, your broker, your funds.
          </p>
        </div>

        <LivePreviewCard />
      </div>
    </section>
  );
}

function LivePreviewCard() {
  const { data, isLoading, isError } = useQuery(publicStatsQueryOptions());
  const hasFeed = !!data && data.top.length > 0;
  const pct = data?.followerReturnPct ?? null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Live feed</span>
        <span
          className={`flex items-center gap-1 ${hasFeed ? "text-profit" : "text-muted-foreground"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${hasFeed ? "animate-pulse bg-profit" : "bg-muted-foreground"}`}
          />
          {isLoading ? "Connecting" : hasFeed ? "Streaming" : "Idle"}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-2xl font-semibold">
            {data?.totalEquity != null
              ? data.totalEquity.toLocaleString(undefined, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })
              : "—"}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            Equity tracked on platform
          </div>
        </div>
        <div
          className={`shrink-0 font-mono text-sm ${
            pct == null ? "text-muted-foreground" : pct >= 0 ? "text-profit" : "text-loss"
          }`}
        >
          {pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && (
          <div className="rounded-md border border-border bg-background/60 px-3 py-6 text-center text-xs text-muted-foreground">
            Reading the live feed…
          </div>
        )}
        {!isLoading && !hasFeed && (
          <div className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {isError
              ? "Live figures are private right now — sign in to see your own."
              : "No accounts are streaming at this moment."}
          </div>
        )}
        {data &&
          hasFeed &&
          data.top.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-xs"
            >
              <span className="truncate font-mono">{r.label}</span>
              <span className={`font-mono ${r.abs >= 0 ? "text-profit" : "text-loss"}`}>
                {r.pct == null
                  ? `${r.abs >= 0 ? "+" : ""}${r.abs.toFixed(2)}`
                  : `${r.pct >= 0 ? "+" : ""}${r.pct.toFixed(2)}%`}
              </span>
            </div>
          ))}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        Open-position return on live CopyDesk accounts, read straight from the terminal feed. Not a
        simulation.
      </p>
    </div>
  );
}

/* ---------------- stats ---------------- */

function StatsStrip() {
  const { data, isLoading } = useQuery(publicStatsQueryOptions());

  const followerPnl = data?.followerReturnAbs ?? null;
  const stats: { k: string; v: string; hint: string; accent?: "profit" | "loss" }[] = [
    {
      k: "Feed latency",
      v: isLoading ? "…" : formatLatency(data?.feedLatencyMs ?? null),
      hint: "Median age of live state",
    },
    {
      k: "Follower P&L from signals",
      v:
        followerPnl == null
          ? "—"
          : `${followerPnl >= 0 ? "+" : ""}${followerPnl.toLocaleString(undefined, {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            })}`,
      hint: "Open copied positions",
      accent: followerPnl == null ? undefined : followerPnl >= 0 ? "profit" : "loss",
    },
    {
      k: "Masters",
      v: isLoading ? "…" : data ? String(data.masters) : "—",
      hint: "Strategies on the platform",
    },
    {
      k: "Live accounts",
      v: isLoading ? "…" : data ? String(data.liveAccounts) : "—",
      hint: "Terminals streaming now",
    },
  ];

  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden border-x border-border bg-border md:grid-cols-4 md:px-8">
        {stats.map((s) => (
          <div key={s.k} className="bg-background/60 p-5 text-center">
            <div
              className={`font-mono text-xl font-semibold md:text-2xl ${
                s.accent === "profit" ? "text-profit" : s.accent === "loss" ? "text-loss" : ""
              }`}
            >
              {s.v}
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
              {s.k}
            </div>
            <div className="mt-0.5 text-[9px] text-muted-foreground/70">{s.hint}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- brokers ---------------- */

const BROKERS = [
  "IC Markets",
  "Pepperstone",
  "Exness",
  "FTMO",
  "Vantage",
  "RoboForex",
  "XM",
  "Tickmill",
  "FxPro",
  "Admirals",
  "Eightcap",
  "BlackBull",
];

function Brokers() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          eyebrow="Compatibility"
          title="Works with any broker that gives you MT5 credentials"
        />
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
          CopyDesk provisions its own MetaTrader 5 terminal against your login, so broker support is
          simply "does it offer MT5". These are the ones our users run most often. (Running a
          strategy on cTrader instead? Masters can connect a cTrader account too — followers still
          copy into MT5.)
        </p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
          {BROKERS.map((b) => (
            <div
              key={b}
              className="flex items-center gap-2 bg-card px-4 py-3.5 text-xs text-muted-foreground"
            >
              <Cable className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{b}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          Broker not listed? If it ships MT5, it works.
        </p>
      </div>
    </section>
  );
}

/* ---------------- how it works ---------------- */

function HowItWorks() {
  const steps = [
    {
      icon: Users,
      title: "Pick a master",
      body: "Browse the directory, compare live P&L, drawdown, win rate, and track record — all computed straight from raw trade history.",
    },
    {
      icon: Cable,
      title: "Connect your MT5 account",
      body: "Provision a follower terminal with your own broker login. Your credentials never touch a third-party managed API.",
    },
    {
      icon: TrendingUp,
      title: "Trades mirror in real time",
      body: "Every fill, modification, and partial close is replicated onto your account by pip-distance and your chosen sizing mode.",
    },
  ];
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow="Process" title="From directory to live fills in three steps" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 font-mono text-xs text-primary">
                {i + 1}
              </span>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- features ---------------- */

function Features() {
  const features = [
    {
      icon: Gauge,
      title: "Real fills, not snapshots",
      body: "Event-driven trade detection with sub-second modification and partial-close handling — not periodic polling.",
    },
    {
      icon: ShieldCheck,
      title: "You keep your broker login",
      body: "No pooled custody. Followers get their own isolated MT5 terminal instance; masters connecting via cTrader grant read-only access — we never see your password.",
    },
    {
      icon: Wallet,
      title: "Transparent, capped fees",
      body: "Masters set their own performance cut. The platform's share is a fixed, disclosed percentage of that cut — never hidden.",
    },
    {
      icon: TrendingUp,
      title: "Three sizing modes",
      body: "Fixed multiplier, balance-proportional, or fixed-master-balance-percentage — pick what matches your risk appetite.",
    },
  ];
  return (
    <section id="features" className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
        <SectionHeading
          eyebrow="Platform"
          title="Built for people who actually check their equity curve"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex gap-3 rounded-lg border border-border bg-background/60 p-5"
            >
              <f.icon className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- pricing preview ---------------- */

function TopMasters() {
  const { data } = useQuery(publicMastersQueryOptions());
  if (!data || data.length === 0) return null;

  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
        <SectionHeading eyebrow="Top masters" title="See who's growing right now" />
        <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
          Public masters, ordered by open unrealised P&amp;L on their own account. Live figures
          straight from the feed — no curated screenshots, no cherry-picked months.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((m) => (
            <div key={m.accountId} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate text-sm font-semibold">{m.displayName}</span>
              </div>
              <div
                className={`mt-3 font-mono text-xl font-semibold ${
                  m.openPnl === null
                    ? "text-muted-foreground"
                    : m.openPnl >= 0
                      ? "text-profit"
                      : "text-loss"
                }`}
              >
                {m.openPnl === null
                  ? "—"
                  : `${m.openPnl >= 0 ? "+" : "-"}$${Math.abs(m.openPnl).toFixed(2)}`}
              </div>
              <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                Open P&amp;L
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Users className="h-3 w-3" /> {m.followers} follower
                {m.followers === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            to="/leaderboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            See the full leaderboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- pricing preview ---------------- */

function PricingPreview() {
  const tiers = [
    {
      name: "Flex",
      blurb: "One month, no commitment.",
      points: [
        "Try it on a live account",
        "Cancel at the end of the cycle",
        "Same feed, same infra",
      ],
    },
    {
      name: "Momentum",
      blurb: "Long enough to judge a real track record.",
      points: [
        "A full quarter of copying",
        "Lower cost per day than Flex",
        "Switch masters anytime",
      ],
    },
    {
      name: "Compounder",
      blurb: "The tier that widens your roster.",
      points: ["Extra roster slot", "Run several masters at once", "Better per-day economics"],
      highlighted: true,
    },
    {
      name: "All-In",
      blurb: "For followers who already know this works.",
      points: ["Longest commitment", "Lowest cost per day", "Set it and let it compound"],
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow="Pricing" title="Simple wallet-based billing, no surprise charges" />
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
        Pricing is per follower account: a small infra fee plus a per-slot fee for each master you
        run, and the longer the cycle the less it costs per day. Exact package pricing is shown live
        in the app once you're signed in — packages can change, and we'd rather show you real
        numbers than stale marketing copy.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-lg border p-5 ${
              t.highlighted ? "border-primary bg-primary/5" : "border-border bg-card"
            }`}
          >
            {t.highlighted && (
              <span className="mb-2 inline-block rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
                Most popular
              </span>
            )}
            <h3 className="text-sm font-semibold">{t.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
            <ul className="mt-4 space-y-1.5">
              {t.points.map((p) => (
                <li key={p} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-primary" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          See live package pricing after signup <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}

/* ---------------- final cta ---------------- */

function FinalCta() {
  return (
    <section className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-8 md:py-20">
        <h2 className="text-2xl font-semibold md:text-3xl">Ready to stop watching charts alone?</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Connect an MT5 account and start copying — or list your own strategy as a master, on MT5
          or cTrader.
        </p>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Get started free <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* ---------------- footer ---------------- */

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-[11px] text-muted-foreground md:flex-row md:px-8">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono tracking-widest">COPYDESK</span>
        </div>
        <div className="font-mono uppercase tracking-widest">
          v0.1.0 · Preview · Not investment advice
        </div>
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-[10px] uppercase tracking-widest text-primary">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h2>
    </div>
  );
}