import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import type { Challenge, ChallengeCriteria } from "@/lib/challenges-mock";
import { challengeMock, useChallengeMock } from "@/lib/challenges-mock";
import { CriteriaSummary, ChallengeStatusBadge } from "@/components/challenges/ChallengeBits";
import { PlaceholderBanner } from "@/components/PlaceholderBanner";
import { Modal } from "@/components/Modal";

export const Route = createFileRoute("/_app/admin/challenges")({
  head: () => ({
    meta: [
      { title: "Challenge Builder — CopyDesk Admin" },
      {
        name: "description",
        content:
          "Create, edit and activate CopyDesk master challenges: criteria thresholds and monthly rewards.",
      },
      { property: "og:title", content: "Challenge Builder — CopyDesk Admin" },
      {
        property: "og:description",
        content: "Create and edit master challenge criteria and rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminChallengesPage,
});

interface Draft {
  id: string;
  name: string;
  description: string;
  rewardAmount: string;
  winRatePct: string;
  profitFactor: string;
  maxDrawdownPct: string;
  referrals: string;
}

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  description: "",
  rewardAmount: "",
  winRatePct: "",
  profitFactor: "",
  maxDrawdownPct: "",
  referrals: "",
});

function toDraft(c: Challenge): Draft {
  return {
    id: c.id,
    name: c.name,
    description: c.description,
    rewardAmount: String(c.rewardAmount),
    winRatePct: c.criteria.winRatePct?.toString() ?? "",
    profitFactor: c.criteria.profitFactor?.toString() ?? "",
    maxDrawdownPct: c.criteria.maxDrawdownPct?.toString() ?? "",
    referrals: c.criteria.referrals?.toString() ?? "",
  };
}

function AdminChallengesPage() {
  const state = useChallengeMock();
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = () => {
    if (!draft) return;
    const criteria: ChallengeCriteria = {};
    if (draft.winRatePct) criteria.winRatePct = Number(draft.winRatePct);
    if (draft.profitFactor) criteria.profitFactor = Number(draft.profitFactor);
    if (draft.maxDrawdownPct) criteria.maxDrawdownPct = Number(draft.maxDrawdownPct);
    if (draft.referrals) criteria.referrals = Number(draft.referrals);

    const existing = state.challenges.find((c) => c.id === draft.id);
    challengeMock.upsertChallenge({
      id: draft.id || `ch-${Date.now()}`,
      name: draft.name || "Untitled challenge",
      description: draft.description,
      isFixed: existing?.isFixed ?? false,
      criteria,
      rewardAmount: Number(draft.rewardAmount) || 0,
      active: existing?.active ?? true,
      status: existing?.status ?? "locked",
    });
    setDraft(null);
  };

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            to="/challenges"
            className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Challenges
          </Link>
          <h1 className="mt-1 font-mono text-lg font-bold tracking-widest">
            CHALLENGE BUILDER
          </h1>
        </div>
        <button
          onClick={() => setDraft(emptyDraft())}
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3 w-3" /> New challenge
        </button>
      </header>

      <PlaceholderBanner text="Mock data — edits live in memory only and reset on reload." />

      <div className="space-y-3">
        {state.challenges.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-border bg-card p-4 md:flex md:items-start md:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{c.name}</h2>
                <ChallengeStatusBadge status={c.status} />
                <span
                  className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
                    c.active
                      ? "border-profit/40 bg-profit/10 text-profit"
                      : "border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {c.active ? "active" : "inactive"}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{c.description}</p>
              <div className="mt-2 font-mono text-xs text-profit">
                ${c.rewardAmount.toLocaleString()}/mo
              </div>
            </div>

            <div className="mt-3 w-full shrink-0 rounded-md border border-border bg-background/60 p-2 md:mt-0 md:w-64">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Criteria
              </div>
              <div className="mt-1.5">
                <CriteriaSummary challenge={c} />
              </div>
            </div>

            <div className="mt-3 flex shrink-0 gap-2 md:mt-0 md:flex-col">
              <button
                onClick={() => setDraft(toDraft(c))}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Edit
              </button>
              <button
                onClick={() => challengeMock.toggleActive(c.id)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {c.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit challenge" : "New challenge"}
      >
        {draft && (
          <div className="space-y-3">
            <Field label="Name">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <textarea
                rows={3}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reward ($/mo)">
                <NumInput
                  value={draft.rewardAmount}
                  onChange={(v) => setDraft({ ...draft, rewardAmount: v })}
                />
              </Field>
              <Field label="Min win rate (%)">
                <NumInput
                  value={draft.winRatePct}
                  onChange={(v) => setDraft({ ...draft, winRatePct: v })}
                />
              </Field>
              <Field label="Min profit factor">
                <NumInput
                  value={draft.profitFactor}
                  onChange={(v) => setDraft({ ...draft, profitFactor: v })}
                />
              </Field>
              <Field label="Max drawdown (%)">
                <NumInput
                  value={draft.maxDrawdownPct}
                  onChange={(v) => setDraft({ ...draft, maxDrawdownPct: v })}
                />
              </Field>
              <Field label="Min referrals">
                <NumInput
                  value={draft.referrals}
                  onChange={(v) => setDraft({ ...draft, referrals: v })}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDraft(null)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function NumInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="decimal"
      className="w-full rounded border border-border bg-background px-2 py-1.5 font-mono text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
