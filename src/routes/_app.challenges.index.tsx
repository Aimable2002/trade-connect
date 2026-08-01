import { createFileRoute, Link } from "@tanstack/react-router";
import { Award, History, Lock, Settings2 } from "lucide-react";
import { challengeMock, useChallengeMock } from "@/lib/challenges-mock";
import {
  ChallengeStatusBadge,
  CriteriaSummary,
} from "@/components/challenges/ChallengeBits";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";

export const Route = createFileRoute("/_app/challenges/")({
  head: () => ({
    meta: [
      { title: "Master Challenges — CopyDesk" },
      {
        name: "description",
        content:
          "Enrol in CopyDesk master challenges, track monthly criteria and unlock graduation rewards.",
      },
      { property: "og:title", content: "Master Challenges — CopyDesk" },
      {
        property: "og:description",
        content: "Enrol in CopyDesk master challenges and unlock graduation rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChallengesPage,
});

function ChallengesPage() {
  const state = useChallengeMock();
  const fixed = state.challenges.find((c) => c.isFixed);

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest">CHALLENGES</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Phase:{" "}
            <span
              className={
                state.phase === "graduated" ? "text-profit" : "text-warning"
              }
            >
              {state.phase}
            </span>
            {state.demoted && (
              <span className="text-loss"> · demoted after drawdown breach</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/challenges/history"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <History className="h-3 w-3" /> History
          </Link>
          <Link
            to="/admin/challenges"
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-3 w-3" /> Admin
          </Link>
        </div>
      </header>

      <PlaceholderBanner label="Mock data — challenge system is not wired to a backend yet." />

      <div className="grid gap-4 md:grid-cols-2">
        {state.challenges.map((c) => (
          <article
            key={c.id}
            className={`rounded-lg border border-border bg-card p-4 ${
              c.status === "locked" ? "opacity-70" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  {c.status === "locked" ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <Award className="h-3.5 w-3.5 text-primary" />
                  )}
                  <h2 className="text-sm font-semibold">{c.name}</h2>
                </div>
                {c.isFixed && (
                  <span className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                    Mandatory
                  </span>
                )}
              </div>
              <ChallengeStatusBadge status={c.status} />
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.description}</p>

            <div className="mt-3 rounded-md border border-border bg-background/60 p-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Monthly criteria
              </div>
              <div className="mt-1.5">
                <CriteriaSummary challenge={c} />
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Reward
                </div>
                <div className="font-mono text-sm text-profit">
                  ${c.rewardAmount.toLocaleString()}/mo
                </div>
              </div>
              {c.status === "available" && (
                <button
                  onClick={() => challengeMock.enroll(c.id)}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Enrol
                </button>
              )}
              {c.status === "enrolled" && !c.isFixed && (
                <button
                  onClick={() => challengeMock.unenroll(c.id)}
                  className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-loss"
                >
                  Leave
                </button>
              )}
              {c.status === "locked" && (
                <span className="text-[10px] text-muted-foreground">
                  Unlocks after Challenge 1
                </span>
              )}
              {c.status === "passed" && (
                <span className="text-[10px] text-profit">Completed</span>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
          Mock controls
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => challengeMock.passChallengeOne()}
            className="rounded border border-profit/40 px-3 py-1.5 text-xs text-profit"
            disabled={fixed?.status === "passed"}
          >
            Simulate pass &amp; graduate
          </button>
          <button
            onClick={() => challengeMock.demote()}
            className="rounded border border-loss/40 px-3 py-1.5 text-xs text-loss"
          >
            Simulate drawdown breach
          </button>
          <button
            onClick={() => challengeMock.reset()}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
