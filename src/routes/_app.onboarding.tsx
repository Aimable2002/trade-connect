import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { provisionAccount, ProvisionError } from "@/lib/api";
import { mastersDirectoryQueryOptions } from "@/lib/queries";
import { ProgressStages } from "@/components/ProgressStages";
import { SizingModeSelect } from "@/components/SizingModeSelect";
import type { SizingMode } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users } from "lucide-react";
import { PatientLoader, ErrorState } from "@/components/DataState";

export const Route = createFileRoute("/_app/onboarding")({
  validateSearch: (search: Record<string, unknown>): { master?: string } => ({
    master: typeof search.master === "string" ? search.master : undefined,
  }),
  component: Onboarding,
});

type Step = "role" | "master-form" | "follower-form";

function Onboarding() {
  const { master: preselectedMaster } = Route.useSearch();
  const [step, setStep] = useState<Step>(preselectedMaster ? "follower-form" : "role");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: provisionAccount,
    onSuccess: (res) => {
      toast.success(`Account ${res.account_id} is ${res.status}`);
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["subscriptions"] });
      navigate({ to: "/dashboard", replace: true });
    },
    onError: (err) => {
      const msg = err instanceof ProvisionError ? err.message : (err as Error).message;
      toast.error(msg, { duration: 10000 });
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-8">
      <div className="mb-6">
        {step !== "role" && !mutation.isPending && (
          <button
            onClick={() => setStep("role")}
            className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        )}
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Onboarding
        </div>
        <h1 className="mt-1 text-2xl font-semibold">
          {step === "role"
            ? "Connect an MT5 account"
            : step === "master-form"
              ? "Set up master account"
              : "Set up follower account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "role"
            ? "Are your trades being copied, or are you copying someone else's?"
            : "Provisioning spins up a live MT5 terminal on our side. This takes about 30–60 seconds."}
        </p>
      </div>

      {mutation.isPending ? (
        <ProgressStages active={mutation.isPending} />
      ) : step === "role" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <button
            onClick={() => setStep("master-form")}
            className="rounded-lg border border-border bg-card p-6 text-left transition-colors hover:border-primary"
          >
            <Crown className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Master</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              I'm the strategy. My trades get copied to followers.
            </p>
          </button>
          <button
            onClick={() => setStep("follower-form")}
            className="rounded-lg border border-border bg-card p-6 text-left transition-colors hover:border-primary"
          >
            <Users className="h-6 w-6 text-primary" />
            <h3 className="mt-3 text-lg font-semibold">Follower</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              I want to copy a master's trades into my MT5 account.
            </p>
          </button>
        </div>
      ) : step === "master-form" ? (
        <MasterForm onSubmit={(v) => mutation.mutate({ role: "master", ...v })} />
      ) : (
        <FollowerForm
          initialMasterId={preselectedMaster}
          onSubmit={(v) => mutation.mutate({ role: "follower", ...v })}
        />
      )}
    </div>
  );
}

interface MT5Fields {
  login: string;
  password: string;
  server: string;
}

function MT5Inputs({ value, onChange }: { value: MT5Fields; onChange: (v: MT5Fields) => void }) {
  return (
    <div className="grid gap-3">
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          MT5 Login
        </span>
        <input
          required
          inputMode="numeric"
          value={value.login}
          onChange={(e) => onChange({ ...value, login: e.target.value })}
          placeholder="52966054"
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Password
        </span>
        <input
          required
          type="password"
          value={value.password}
          onChange={(e) => onChange({ ...value, password: e.target.value })}
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Server</span>
        <input
          required
          value={value.server}
          onChange={(e) => onChange({ ...value, server: e.target.value })}
          placeholder="ICMarketsSC-Demo"
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
      </label>
    </div>
  );
}

function MasterForm({ onSubmit }: { onSubmit: (v: MT5Fields) => void }) {
  const [fields, setFields] = useState<MT5Fields>({
    login: "",
    password: "",
    server: "",
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(fields);
      }}
      className="space-y-5"
    >
      <MT5Inputs value={fields} onChange={setFields} />
      <SubmitBar label="Provision master account" />
    </form>
  );
}

function FollowerForm({
  onSubmit,
  initialMasterId,
}: {
  onSubmit: (
    v: MT5Fields & {
      master_account_id: string;
      multiplier: number;
      sizing_mode: SizingMode;
    },
  ) => void;
  initialMasterId?: string;
}) {
  const [fields, setFields] = useState<MT5Fields>({
    login: "",
    password: "",
    server: "",
  });
  const [masterId, setMasterId] = useState<string>(initialMasterId ?? "");
  const [multiplier, setMultiplier] = useState(1.0);
  const [mode, setMode] = useState<SizingMode>("fixed_multiplier");

  const { data: masters, isLoading, error } = useQuery(mastersDirectoryQueryOptions());

  useEffect(() => {
    if (!masterId && masters && masters.length > 0) {
      setMasterId(masters[0].account_id);
    }
  }, [masters, masterId]);

  const preselected = !!initialMasterId;
  const preselectedMaster = (masters ?? []).find((m) => m.account_id === initialMasterId);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!masterId) {
          toast.error("Pick a master to copy first.");
          return;
        }
        onSubmit({
          ...fields,
          master_account_id: masterId,
          multiplier,
          sizing_mode: mode,
        });
      }}
      className="space-y-6"
    >
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Your MT5 credentials
        </div>
        <div className="mt-2">
          <MT5Inputs value={fields} onChange={setFields} />
        </div>
      </div>

      {preselected && preselectedMaster && (
        <div className="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary">
          Copying <span className="font-semibold">{preselectedMaster.display_name}</span> — you can
          pick a different master below anytime.
        </div>
      )}

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Master to copy
        </div>
        {isLoading && <PatientLoader label="Loading directory…" compact className="mt-2" />}
        {error && (
          <ErrorState
            className="mt-2"
            message={`Couldn't load directory: ${(error as Error).message}`}
          />
        )}
        {!isLoading && !error && (masters ?? []).length === 0 && (
          <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            No public masters yet. Ask a master to publish their profile.
          </div>
        )}
        <div className="mt-2 grid gap-2">
          {(masters ?? []).map((m) => (
            <button
              key={m.account_id}
              type="button"
              onClick={() => setMasterId(m.account_id)}
              className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-left ${
                masterId === m.account_id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-sm">{m.display_name}</div>
                {m.bio && (
                  <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                    {m.bio}
                  </div>
                )}
              </div>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {m.account_id.slice(0, 8)}…
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Sizing mode
        </div>
        <div className="mt-2">
          <SizingModeSelect value={mode} onChange={setMode} />
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Multiplier
        </span>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={multiplier}
          onChange={(e) => setMultiplier(parseFloat(e.target.value))}
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
      </label>

      <SubmitBar label="Provision follower account" />
    </form>
  );
}

function SubmitBar({ label }: { label: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Provisioning usually takes <span className="font-mono">30–60s</span>, but can occasionally
        take a few minutes if the broker server is slow. We'll keep waiting for up to 5 minutes —
        don't close the tab or resubmit.
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {label}
      </button>
    </div>
  );
}