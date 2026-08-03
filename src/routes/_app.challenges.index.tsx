import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, History, Lock, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  ApiError,
  enrollInChallenge,
  leaveChallenge,
  type Challenge,
} from "@/lib/api";
import {
  accountsQueryOptions,
  challengeStatusQueryOptions,
  challengesQueryOptions,
} from "@/lib/queries";
import {
  ChallengeStatusBadge,
  CriteriaSummary,
  type ChallengeStatus,
} from "@/components/challenges/ChallengeBits";
import { DataState } from "@/components/DataState";

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
  const qc = useQueryClient();
  const accountsQ = useQuery(accountsQueryOptions());
  const masters = useMemo(
    () => (accountsQ.data ?? []).filter((a) => a.role === "master"),
    [accountsQ.data],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const accountId = selected ?? masters[0]?.account_id ?? undefined;

  const challengesQ = useQuery(challengesQueryOptions());
  const statusQ = useQuery(challengeStatusQueryOptions(accountId));

  const currentChallengeId = statusQ.data?.current_enrollment?.challenge_id ?? null;
  const phase = statusQ.data?.phase ?? null;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["masters", accountId, "challenges"] });
  };

  const enroll = useMutation({
    mutationFn: (challengeId: string) => enrollInChallenge(accountId!, challengeId),
    onSuccess: () => {
      toast.success("Enrolled.");
      invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  const leave = useMutation({
    mutationFn: (challengeId: string) => leaveChallenge(accountId!, challengeId),
    onSuccess: () => {
      toast.success("Left the challenge.");
      invalidate();
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  /**
   * Optional challenges stay locked until the master has graduated — the
   * fixed challenge is the gate, exactly as the backend enforces it.
   */
  const statusFor = (c: Challenge): ChallengeStatus => {
    if (currentChallengeId === c.id) return "enrolled";
    if (!c.active) return "inactive";
    if (!c.is_fixed && phase !== "graduated") return "locked";
    return "available";
  };

  const challenges = challengesQ.data ?? [];

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-mono text-lg font-bold tracking-widest">CHALLENGES</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {phase ? (
              <>
                Phase:{" "}
                <span className={phase === "graduated" ? "text-profit" : "text-warning"}>
                  {phase}
                </span>
              </>
            ) : (
              "Pass the mandatory challenge to graduate and unlock the rest."
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

      {masters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {masters.map((m) => (
            <button
              key={m.account_id}
              onClick={() => setSelected(m.account_id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] ${
                m.account_id === accountId
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {m.account_id}
            </button>
          ))}
        </div>
      )}

      {!accountsQ.isLoading && masters.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground">
          Challenges are for master accounts. Provision a master account to enrol.
        </div>
      )}

      <DataState
        isLoading={challengesQ.isLoading}
        error={challengesQ.error as Error | null}
        isEmpty={!challengesQ.isLoading && challenges.length === 0}
        emptyText="No challenges published yet."
        loadingText="Loading challenges…"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => {
            const status = statusFor(c);
            const busy = enroll.isPending || leave.isPending;
            return (
              <article
                key={c.id}
                className={`rounded-lg border border-border bg-card p-4 ${
                  status === "locked" || status === "inactive" ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {status === "locked" ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Award className="h-3.5 w-3.5 text-primary" />
                      )}
                      <h2 className="text-sm font-semibold">{c.name}</h2>
                    </div>
                    {c.is_fixed && (
                      <span className="mt-1 inline-block rounded border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                        Mandatory
                      </span>
                    )}
                  </div>
                  <ChallengeStatusBadge status={status} />
                </div>

                {c.description && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {c.description}
                  </p>
                )}

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
                      ${Number(c.reward_amount ?? 0).toLocaleString()}/mo
                    </div>
                  </div>
                  {status === "available" && accountId && (
                    <button
                      disabled={busy}
                      onClick={() => enroll.mutate(c.id)}
                      className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"
                    >
                      {enroll.isPending ? "Enrolling…" : "Enrol"}
                    </button>
                  )}
                  {status === "enrolled" && !c.is_fixed && (
                    <button
                      disabled={busy}
                      onClick={() => leave.mutate(c.id)}
                      className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-loss disabled:opacity-40"
                    >
                      {leave.isPending ? "Leaving…" : "Leave"}
                    </button>
                  )}
                  {status === "enrolled" && c.is_fixed && (
                    <span className="text-[10px] text-muted-foreground">
                      Mandatory — can't be left
                    </span>
                  )}
                  {status === "locked" && (
                    <span className="text-[10px] text-muted-foreground">
                      Unlocks after graduation
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </DataState>
    </div>
  );
}
