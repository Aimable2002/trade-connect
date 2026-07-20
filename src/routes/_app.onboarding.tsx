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

export const Route = createFileRoute("/_app/onboarding")({
  component: Onboarding,
});

type Step = "role" | "master-form" | "follower-form";


function Onboarding() {
  const [step, setStep] = useState<Step>("role");
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
      const msg =
        err instanceof ProvisionError ? err.message : (err as Error).message;
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

function MT5Inputs({
  value,
  onChange,
}: {
  value: MT5Fields;
  onChange: (v: MT5Fields) => void;
}) {
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
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Server
        </span>
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

function MasterForm({
  onSubmit,
}: {
  onSubmit: (v: MT5Fields) => void;
}) {
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
}: {
  onSubmit: (
    v: MT5Fields & {
      master_account_id: string;
      multiplier: number;
      sizing_mode: SizingMode;
    },
  ) => void;
}) {
  const [fields, setFields] = useState<MT5Fields>({
    login: "",
    password: "",
    server: "",
  });
  const [masterId, setMasterId] = useState(SAMPLE_MASTERS[0].id);
  const [multiplier, setMultiplier] = useState(1.0);
  const [mode, setMode] = useState<SizingMode>("fixed_multiplier");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
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

      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Master to copy
        </div>
        <div className="mt-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
          Sample masters — real directory ships with the next release.
        </div>
        <div className="mt-2 grid gap-2">
          {SAMPLE_MASTERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMasterId(m.id)}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-left ${
                masterId === m.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-sm">{m.name}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                risk {m.risk}/10
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
        Provisioning can take up to <span className="font-mono">60s</span>.
        Don't close the tab.
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
