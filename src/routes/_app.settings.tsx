import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { accountsQueryOptions, subscriptionsQueryOptions } from "@/lib/queries";
import { SizingModeSelect } from "@/components/SizingModeSelect";
import { NumericValue } from "@/components/NumericValue";
import { useEffect, useState } from "react";
import { supabase, type SizingMode, type SubscriptionRow } from "@/lib/supabase";
import { toast } from "sonner";
import { Pause, Play, X, Save } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const { data: subs } = useQuery(subscriptionsQueryOptions());
  const { data: accounts } = useQuery(accountsQueryOptions());

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Configuration
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Follower subscriptions</h2>
        {(subs ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No follower subscriptions yet.
          </div>
        )}
        <div className="grid gap-4">
          {(subs ?? []).map((s) => (
            <SubscriptionEditor key={s.follower_account_id + s.master_account_id} sub={s} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Account controls</h2>
        <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
          Pause / resume / close endpoints are coming soon — buttons are disabled.
        </div>
        <div className="grid gap-2">
          {(accounts ?? []).map((a) => (
            <div
              key={a.account_id}
              className="flex items-center justify-between rounded-md border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-widest text-primary">
                  {a.role}
                </div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">
                  {a.account_id}
                </div>
              </div>
              <div className="flex gap-1">
                <button disabled className="grid h-8 w-8 place-items-center rounded border border-border text-muted-foreground opacity-50">
                  <Pause className="h-3.5 w-3.5" />
                </button>
                <button disabled className="grid h-8 w-8 place-items-center rounded border border-border text-muted-foreground opacity-50">
                  <Play className="h-3.5 w-3.5" />
                </button>
                <button disabled className="grid h-8 w-8 place-items-center rounded border border-border text-loss opacity-50">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SubscriptionEditor({ sub }: { sub: SubscriptionRow }) {
  const [multiplier, setMultiplier] = useState(sub.multiplier);
  const [mode, setMode] = useState<SizingMode>(sub.sizing_mode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMultiplier(sub.multiplier);
    setMode(sub.sizing_mode);
  }, [sub.multiplier, sub.sizing_mode]);

  const dirty = multiplier !== sub.multiplier || mode !== sub.sizing_mode;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("subscriptions")
      .update({ multiplier, sizing_mode: mode })
      .eq("follower_account_id", sub.follower_account_id)
      .eq("master_account_id", sub.master_account_id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Subscription updated");
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Follower
          </div>
          <div className="mt-0.5 font-mono">{sub.follower_account_id}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Master
          </div>
          <div className="mt-0.5 font-mono">{sub.master_account_id}</div>
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
          value={multiplier}
          onChange={(e) => setMultiplier(parseFloat(e.target.value))}
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-primary"
        />
      </label>

      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Sizing mode
        </div>
        <div className="mt-2">
          <SizingModeSelect value={mode} onChange={setMode} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          Current:{" "}
          <NumericValue value={sub.multiplier} flash={false} /> ·{" "}
          <span className="font-mono">{sub.sizing_mode}</span>
        </div>
        <button
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
