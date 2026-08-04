import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Challenge, ChallengeCriteria } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { challengesQueryOptions } from "@/lib/queries";
import { CriteriaSummary } from "@/components/challenges/ChallengeBits";
import { ErrorState, PatientLoader } from "@/components/DataState";
import { Modal } from "@/components/Modal";
import { AdminGate } from "@/components/AdminGate";

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

/**
 * These are the only criteria the UI treats as first-class/predefined -
 * shown with their own labeled input. Referrals are deliberately NOT in
 * this list: referral tracking isn't a guaranteed, always-present field on
 * every challenge, so it shouldn't be forced into the same required-looking
 * data package as the metrics that are. An admin who wants a referral
 * threshold can still add it as a custom key ("referrals") below - it's
 * fully supported, just optional rather than baked in.
 */
const PREDEFINED = [
  { key: "winRatePct", label: "Min win rate (%)" },
  { key: "profitFactor", label: "Min profit factor" },
  { key: "maxDrawdownPct", label: "Max drawdown (%)" },
] as const;

interface CustomRow {
  label: string;
  value: string;
}

interface Draft {
  id: string;
  name: string;
  description: string;
  rewardAmount: string;
  predefined: Record<string, string>;
  custom: CustomRow[];
  isFixed: boolean;
}

const emptyDraft = (): Draft => ({
  id: "",
  name: "",
  description: "",
  rewardAmount: "",
  predefined: {},
  custom: [],
  isFixed: false,
});

function toDraft(c: Challenge): Draft {
  const predefinedKeys = PREDEFINED.map((p) => p.key) as readonly string[];
  const predefined: Record<string, string> = {};
  const custom: CustomRow[] = [];
  for (const [k, v] of Object.entries(c.criteria ?? {})) {
    if (predefinedKeys.includes(k)) predefined[k] = String(v ?? "");
    else custom.push({ label: k, value: String(v ?? "") });
  }
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    rewardAmount: String(c.reward_amount ?? ""),
    predefined,
    custom,
    isFixed: c.is_fixed,
  };
}

/** Numeric-looking values are stored as numbers so thresholds stay comparable. */
function coerce(value: string): string | number {
  const trimmed = value.trim();
  if (trimmed !== "" && !Number.isNaN(Number(trimmed))) return Number(trimmed);
  return trimmed;
}

function AdminChallengesPage() {
  return (
    <AdminGate>
      <AdminChallengesPageContent />
    </AdminGate>
  );
}

function AdminChallengesPageContent() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery(challengesQueryOptions());
  const [draft, setDraft] = useState<Draft | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["challenges"] });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const criteria: ChallengeCriteria = {};
      for (const p of PREDEFINED) {
        const raw = d.predefined[p.key];
        if (raw != null && raw.trim() !== "") criteria[p.key] = coerce(raw);
      }
      for (const row of d.custom) {
        const key = row.label.trim();
        if (!key) continue;
        criteria[key] = coerce(row.value);
      }
      const payload = {
        name: d.name.trim() || "Untitled challenge",
        description: d.description.trim() || null,
        criteria,
        reward_amount: Number(d.rewardAmount) || 0,
        is_fixed: d.isFixed,
        // Challenge 1 is the public entry point every master lands on before
        // anything else unlocks, so it can't be saved inactive - that would
        // silently lock everyone out of graduating with no way to tell why.
        active: d.isFixed ? true : undefined,
      };

      // Only one challenge can be "Challenge 1" at a time - has_passed_challenge_one()
      // on the backend resolves it via a single .limit(1) lookup, so two fixed rows
      // would make graduation depend on unspecified row order. Making this one fixed
      // demotes whichever challenge currently holds that slot (a no-op if there isn't
      // one, or if it's this same challenge).
      if (d.isFixed) {
        const currentFixed = (data ?? []).find((c) => c.is_fixed && c.id !== d.id);
        if (currentFixed) {
          const { error: demoteErr } = await supabase
            .from("challenges")
            .update({ is_fixed: false })
            .eq("id", currentFixed.id);
          if (demoteErr) throw demoteErr;
        }
      }

      if (d.id) {
        const { error: e } = await supabase
          .from("challenges")
          .update(payload)
          .eq("id", d.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("challenges")
          .insert({ ...payload, active: true });
        if (e) throw e;
      }
    },
    onSuccess: (_data, d) => {
      toast.success(d.isFixed ? "Saved as Challenge 1 (mandatory, public)." : "Challenge saved.");
      setDraft(null);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleActive = useMutation({
    mutationFn: async (c: Challenge) => {
      if (c.is_fixed && c.active) {
        throw new Error(
          "Challenge 1 can't be deactivated while it's the mandatory entry point - " +
            "unset \"Challenge 1\" on it first (or make another challenge Challenge 1).",
        );
      }
      const { error: e } = await supabase
        .from("challenges")
        .update({ active: !c.active })
        .eq("id", c.id);
      if (e) throw e;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const challenges = data ?? [];

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

      {isLoading && <PatientLoader label="Loading challenges…" />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      <div className="space-y-3">
        {challenges.map((c) => (
          <article
            key={c.id}
            className="rounded-lg border border-border bg-card p-4 md:flex md:items-start md:gap-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{c.name}</h2>
                {c.is_fixed && (
                  <span className="rounded border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    mandatory
                  </span>
                )}
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
              {c.description && (
                <p className="mt-1.5 text-xs text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-2 font-mono text-xs text-profit">
                ${Number(c.reward_amount ?? 0).toLocaleString()}/mo
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
                disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate(c)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
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
              {PREDEFINED.map((p) => (
                <Field key={p.key} label={p.label}>
                  <NumInput
                    value={draft.predefined[p.key] ?? ""}
                    onChange={(v) =>
                      setDraft({
                        ...draft,
                        predefined: { ...draft.predefined, [p.key]: v },
                      })
                    }
                  />
                </Field>
              ))}
            </div>

            <label className="flex items-start gap-2 rounded-md border border-border bg-background/60 p-2.5">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={draft.isFixed}
                onChange={(e) => setDraft({ ...draft, isFixed: e.target.checked })}
              />
              <span className="text-xs">
                <span className="font-semibold">Make this Challenge 1</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                  Mandatory and open to every master immediately. Every other challenge
                  stays locked until a master passes this one. Only one challenge can hold
                  this slot — checking it here unfixes whichever challenge currently has it.
                </span>
              </span>
            </label>

            <div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
                Custom criteria
              </div>
              <div className="mt-1.5 space-y-2">
                {draft.custom.map((row, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      placeholder="Label"
                      className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-sm"
                      value={row.label}
                      onChange={(e) => {
                        const custom = [...draft.custom];
                        custom[i] = { ...row, label: e.target.value };
                        setDraft({ ...draft, custom });
                      }}
                    />
                    <input
                      placeholder="Value"
                      className="w-28 shrink-0 rounded border border-border bg-background px-2 py-1.5 font-mono text-sm"
                      value={row.value}
                      onChange={(e) => {
                        const custom = [...draft.custom];
                        custom[i] = { ...row, value: e.target.value };
                        setDraft({ ...draft, custom });
                      }}
                    />
                    <button
                      aria-label="Remove criterion"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          custom: draft.custom.filter((_, j) => j !== i),
                        })
                      }
                      className="shrink-0 rounded border border-border p-1.5 text-muted-foreground hover:text-loss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setDraft({ ...draft, custom: [...draft.custom, { label: "", value: "" }] })
                  }
                  className="flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" /> Add custom criterion
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDraft(null)}
                className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground"
              >
                Cancel
              </button>
              <button
                disabled={save.isPending}
                onClick={() => save.mutate(draft)}
                className="rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
              >
                {save.isPending ? "Saving…" : "Save"}
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
