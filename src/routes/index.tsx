import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatLatency, publicStatsQueryOptions } from "@/lib/public-stats";
import {
  Activity,
  ArrowRight,
  Cable,
  Gauge,
  ShieldCheck,
  Sparkles,
  TrendingUp,
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
            <Sparkles className="h-3 w-3 text-primary" /> MT5 copy trading, done right
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Copy live MT5 trades from vetted masters — in real time, on your own broker account.
          </h1>
          <p className="mt-4 max-w-lg text-sm text-muted-foreground md:text-base">
            CopyDesk mirrors a master's fills into your MetaTrader 5 account as they happen. Full
            transparency on balance, equity, and open positions — you always control your own broker
            login.
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

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>Live preview</span>
            <span className="flex items-center gap-1 text-profit">
              <span className="h-1.5 w-1.5 rounded-full bg-profit" /> Streaming
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-semibold">$12,480.55</div>
            <div className="font-mono text-sm text-profit">+4.2%</div>
          </div>
          <div className="mt-4 h-24 w-full overflow-hidden rounded-md bg-muted/30">
            <svg viewBox="0 0 300 100" className="h-full w-full" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke="var(--profit)"
                strokeWidth="2"
                points="0,80 30,72 60,76 90,55 120,60 150,40 180,46 210,28 240,34 270,18 300,22"
              />
            </svg>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { m: "Nova FX", pct: "+1.8%", pos: true },
              { m: "Apex Scalper", pct: "-0.4%", pos: false },
              { m: "Delta Swing", pct: "+2.1%", pos: true },
            ].map((r) => (
              <div
                key={r.m}
                className="flex items-center justify-between rounded-md border border-border bg-background/60 px-3 py-2 text-xs"
              >
                <span>{r.m}</span>
                <span className={r.pos ? "font-mono text-profit" : "font-mono text-loss"}>
                  {r.pct}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- stats ---------------- */

function StatsStrip() {
  const stats = [
    { k: "AVG LATENCY", v: "180ms" },
    { k: "UPTIME", v: "99.94%" },
    { k: "MASTERS", v: "142" },
    { k: "SUPPORTED BROKERS", v: "MT5" },
  ];
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px overflow-hidden border-x border-border bg-border md:grid-cols-4 md:px-8">
        {stats.map((s) => (
          <div key={s.k} className="bg-background/60 p-5 text-center">
            <div className="font-mono text-xl font-semibold md:text-2xl">{s.v}</div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground">
              {s.k}
            </div>
          </div>
        ))}
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
      body: "Browse the directory, compare live P&L, drawdown, win rate, and track record — all computed straight from raw MT5 deal history.",
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
      body: "No pooled custody. Your credentials provision your own isolated MT5 terminal instance.",
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

function PricingPreview() {
  const tiers = [
    {
      name: "Starter",
      blurb: "One master, one follower account.",
      points: ["1 roster slot", "Standard infra fee", "Email support"],
    },
    {
      name: "Growth",
      blurb: "For running a small copy-trading portfolio.",
      points: ["Multiple roster slots", "Switch masters anytime", "Priority infra"],
      highlighted: true,
    },
    {
      name: "Pro",
      blurb: "Higher roster ceiling, built for scale.",
      points: ["Largest roster size", "Lowest per-slot fee", "Priority support"],
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <SectionHeading eyebrow="Pricing" title="Simple wallet-based billing, no surprise charges" />
      <p className="mx-auto mt-3 max-w-xl text-center text-xs text-muted-foreground">
        Pricing is per follower account: a small infra fee plus a per-slot fee for each master you
        run. Exact package pricing is shown live in the app once you're signed in — packages can
        change, and we'd rather show you real numbers than stale marketing copy.
      </p>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
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
          Connect an MT5 account and start copying — or list your own strategy as a master.
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