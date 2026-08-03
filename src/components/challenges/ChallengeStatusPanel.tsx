import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Info } from "lucide-react";
import { toast } from "sonner";
import { ApiError, leaveChallenge } from "@/lib/api";
import { challengeStatusQueryOptions } from "@/lib/queries";
import { CriteriaSummary } from "@/components/challenges/ChallengeBits";
import { ErrorState, PatientLoader } from "@/components/DataState";

/** Master-role challenge status for one account, wired to the live backend. */
export function ChallengeStatusPanel({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(
    challengeStatusQueryOptions(accountId),
  );

  const enrollment = data?.current_enrollment ?? null;
  const challenge = enrollment?.challenge ?? null;

  const leave = useMutation({
    mutationFn: () => leaveChallenge(accountId, enrollment!.challenge_id),
    onSuccess: () => {
      toast.success("Left the challenge.");
      qc.invalidateQueries({ queryKey: ["masters", accountId, "challenges"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : (e as Error).message),
  });

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Challenge status
        </div>
        <Link
          to="/challenges"
          className="text-[10px] uppercase tracking-widest text-primary hover:underline"
        >
          All challenges
        </Link>
      </div>

      {isLoading && <PatientLoader label="Loading status…" compact className="mt-3" />}
      {error && (
        <ErrorState
          message={(error as Error).message}
          onRetry={() => refetch()}
          className="mt-3"
        />
      )}

      {data && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded border border-border bg-background/60 px-2 py-1 text-xs">
              <GraduationCap className="h-3.5 w-3.5 text-primary" />
              Phase:{" "}
              <span
                className={
                  data.phase === "graduated"
                    ? "font-semibold text-profit"
                    : "font-semibold text-warning"
                }
              >
                {data.phase}
              </span>
            </span>
            {enrollment?.enrolled_at && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {!enrollment && (
            <div className="mt-3 text-xs text-muted-foreground">
              Not enrolled in any challenge.{" "}
              <Link to="/challenges" className="text-primary hover:underline">
                Browse challenges
              </Link>
            </div>
          )}

          {enrollment && (
            <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-semibold">
                  {challenge?.name ?? enrollment.challenge_name ?? "Current challenge"}
                </div>
                {challenge && !challenge.is_fixed && (
                  <button
                    disabled={leave.isPending}
                    onClick={() => leave.mutate()}
                    className="rounded border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-loss disabled:opacity-40"
                  >
                    {leave.isPending ? "Leaving…" : "Leave"}
                  </button>
                )}
              </div>
              {challenge?.description && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {challenge.description}
                </p>
              )}
              {challenge && (
                <div className="mt-2">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                    Monthly criteria
                  </div>
                  <div className="mt-1.5">
                    <CriteriaSummary challenge={challenge} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Monthly pass/fail is computed by an evaluation job that isn't
              live yet, so this panel deliberately shows enrolment state
              only — no simulated per-criterion verdicts. */}
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-background/40 p-2 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Monthly evaluation runs at period close. Results appear in{" "}
              <Link to="/challenges/history" className="text-primary hover:underline">
                challenge history
              </Link>{" "}
              once a period has been scored.
            </span>
          </div>
        </>
      )}
    </section>
  );
}
