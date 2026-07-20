import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountsQueryOptions,
  subscriptionsQueryOptions,
} from "@/lib/queries";
import { SizingModeSelect } from "@/components/SizingModeSelect";
import { NumericValue } from "@/components/NumericValue";
import { StatusPill } from "@/components/StatusPill";
import { Modal } from "@/components/Modal";
import { useEffect, useState } from "react";
import {
  supabase,
  type AccountRow,
  type SizingMode,
  type SubscriptionRow,
} from "@/lib/supabase";
import {
  ApiError,
  closeAccount,
  pauseAccount,
  resumeAccount,
  upsertMasterProfile,
} from "@/lib/api";
import { toast } from "sonner";
import { Pause, Play, X, Save, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const { data: subs } = useQuery(subscriptionsQueryOptions());
  const { data: accounts } = useQuery(accountsQueryOptions());

  const masters = (accounts ?? []).filter((a) => a.role === "master");

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Configuration
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
      </header>

      {masters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Master directory profile</h2>
          <p className="text-xs text-muted-foreground">
            Followers only see your master account once you set{" "}
            <span className="font-mono">is_public</span> to true.
          </p>
          <div className="grid gap-4">
            {masters.map((m) => (
              <MasterProfileEditor key={m.account_id} account={m} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Follower subscriptions</h2>
        {(subs ?? []).length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No follower subscriptions yet.
          </div>
        )}
        <div className="grid gap-4">
          {(subs ?? []).map((s) => (
            <SubscriptionEditor
              key={s.follower_account_id + s.master_account_id}
              sub={s}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Account controls</h2>
        <div className="grid gap-2">
          {(accounts ?? []).map((a) => (
            <AccountControls key={a.account_id} account={a} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------- Account controls (pause / resume / close) ----------

function AccountControls({ account }: { account: AccountRow }) {
  const qc = useQueryClient();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["accounts"] });
  };
  const handleError = (e: unknown) => {
    const msg = e instanceof ApiError ? e.message : (e as Error).message;
    toast.error(msg, { duration: 8000 });
  };

  const pauseM = useMutation({
    mutationFn: (force_close: boolean) =>
      pauseAccount(account.account_id, force_close),
    onSuccess: (r) => {
      toast.success(
        r.closed_fills > 0
          ? `Paused — force-closed ${r.closed_fills} position(s).`
          : "Paused.",
      );
      setPauseOpen(false);
      invalidate();
    },
    onError: handleError,
  });

  const resumeM = useMutation({
    mutationFn: () => resumeAccount(account.account_id),
    onSuccess: () => {
      toast.success("Resumed.");
      invalidate();
    },
    onError: handleError,
  });

  const closeM = useMutation({
    mutationFn: () => closeAccount(account.account_id),
    onSuccess: (r) => {
      toast.success(
        r.closed_fills && r.closed_fills > 0
          ? `Closed — ${r.closed_fills} position(s) force-closed. Terminal terminated.`
          : "Closed. Terminal terminated.",
      );
      setCloseOpen(false);
      setConfirmText("");
      invalidate();
    },
    onError: handleError,
  });

  const status = (account.status ?? "").toLowerCase();
  const isPaused = status === "paused";
  const isClosed = status === "closed" || status === "offline";
  const busy = pauseM.isPending || resumeM.isPending || closeM.isPending;

  return (
    <>
      <div className="flex items-center justify-between rounded-md border border-border bg-card p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold uppercase tracking-widest text-primary">
              {account.role}
            </div>
            <StatusPill status={account.status} />
          </div>
          <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
            {account.account_id}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            disabled={busy || isPaused || isClosed}
            onClick={() => setPauseOpen(true)}
            title="Pause"
            className="grid h-8 w-8 place-items-center rounded border border-border text-warning hover:border-warning/60 disabled:opacity-40"
          >
            <Pause className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={busy || !isPaused}
            onClick={() => resumeM.mutate()}
            title="Resume"
            className="grid h-8 w-8 place-items-center rounded border border-border text-profit hover:border-profit/60 disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
          <button
            disabled={busy || isClosed}
            onClick={() => setCloseOpen(true)}
            title="Close (destructive)"
            className="grid h-8 w-8 place-items-center rounded border border-border text-loss hover:border-loss/60 disabled:opacity-40"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <Modal
        open={pauseOpen}
        onClose={() => !pauseM.isPending && setPauseOpen(false)}
        title="Pause account"
      >
        <p className="text-xs text-muted-foreground">
          Choose how to handle positions currently open on this account.
        </p>
        <div className="mt-4 grid gap-2">
          <button
            disabled={pauseM.isPending}
            onClick={() => pauseM.mutate(false)}
            className="rounded-md border border-border bg-card p-3 text-left hover:border-primary/60 disabled:opacity-50"
          >
            <div className="text-sm font-semibold">Stop new copies only</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Existing open positions stay open and continue to move with the
              market. Recommended.
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              force_close: false
            </div>
          </button>
          <button
            disabled={pauseM.isPending}
            onClick={() => pauseM.mutate(true)}
            className="rounded-md border border-loss/40 bg-loss/5 p-3 text-left hover:border-loss disabled:opacity-50"
          >
            <div className="flex items-center gap-1.5 text-sm font-semibold text-loss">
              <ShieldAlert className="h-3.5 w-3.5" />
              Stop AND force-close everything now
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Immediately closes every open position at market. Realized P&amp;L
              will lock in whatever the current spread gives you.
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground/60">
              force_close: true
            </div>
          </button>
        </div>
        {pauseM.isPending && (
          <div className="mt-3 text-center text-xs text-muted-foreground">
            Pausing…
          </div>
        )}
      </Modal>

      <Modal
        open={closeOpen}
        onClose={() => !closeM.isPending && setCloseOpen(false)}
        title="Close account permanently"
      >
        <div className="rounded-md border border-loss/40 bg-loss/5 p-3 text-xs text-loss">
          This terminates the live MT5 terminal process for this account. Any
          open positions will be force-closed at market. This cannot be undone
          — you'd need to re-provision from scratch to trade this account
          again.
        </div>
        <label className="mt-4 block">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Type CLOSE to confirm
          </span>
          <input
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 font-mono text-sm outline-none focus:border-loss"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => setCloseOpen(false)}
            disabled={closeM.isPending}
            className="rounded-md border border-border px-3 py-1.5 text-xs"
          >
            Cancel
          </button>
          <button
            disabled={closeM.isPending || confirmText.trim() !== "CLOSE"}
            onClick={() => closeM.mutate()}
            className="rounded-md bg-loss px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {closeM.isPending ? "Closing…" : "Close permanently"}
          </button>
        </div>
      </Modal>
    </>
  );
}

// ---------- Master profile ----------

function MasterProfileEditor({ account }: { account: AccountRow }) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const qc = useQueryClient();

  // Best-effort: read any existing profile row directly from Supabase.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("master_profiles")
        .select("display_name,bio,is_public")
        .eq("account_id", account.account_id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setDisplayName((data as { display_name?: string }).display_name ?? "");
        setBio((data as { bio?: string }).bio ?? "");
        setIsPublic(!!(data as { is_public?: boolean }).is_public);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [account.account_id]);

  const save = useMutation({
    mutationFn: () =>
      upsertMasterProfile(account.account_id, {
        display_name: displayName.trim(),
        bio: bio.trim() || undefined,
        is_public: isPublic,
      }),
    onSuccess: (r) => {
      toast.success(
        r.is_public
          ? "Profile published — you're now in the directory."
          : "Profile saved (not public).",
      );
      qc.invalidateQueries({ queryKey: ["masters", "directory"] });
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : (e as Error).message;
      toast.error(msg, { duration: 8000 });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Master account
          </div>
          <div className="mt-0.5 truncate font-mono text-xs">
            {account.account_id}
          </div>
        </div>
        <div
          className={
            isPublic
              ? "rounded border border-profit/40 bg-profit/10 px-2 py-0.5 text-[10px] font-semibold text-profit"
              : "rounded border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
          }
        >
          {isPublic ? "PUBLIC" : "PRIVATE"}
        </div>
      </div>

      <label className="block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Display name
        </span>
        <input
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={!loaded}
          placeholder="e.g. Northwind Systematic"
          className="mt-1 block w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="mt-3 block">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Bio (optional)
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={!loaded}
          rows={3}
          placeholder="Style, markets, timeframe…"
          className="mt-1 block w-full resize-none rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>

      <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-md border border-border p-3">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          disabled={!loaded}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <div>
          <div className="text-sm font-medium">List in public directory</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Any signed-in user will be able to view your display name, bio, and
            trade history. Your MT5 login and credentials remain private.
          </div>
        </div>
      </label>

      <div className="mt-4 flex justify-end">
        <button
          disabled={save.isPending || !displayName.trim() || !loaded}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

// ---------- Subscription editor (unchanged behavior) ----------

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
          Current: <NumericValue value={sub.multiplier} flash={false} /> ·{" "}
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
