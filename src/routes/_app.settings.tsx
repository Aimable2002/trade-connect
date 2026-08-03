import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { KeyRound, LogOut, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — CopyDesk" },
      {
        name: "description",
        content:
          "Manage your CopyDesk sign-in email, password and session. Per-account trading controls live on each account's detail page.",
      },
      { property: "og:title", content: "Account Settings — CopyDesk" },
      {
        property: "og:description",
        content: "Manage your CopyDesk sign-in email, password and session.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-8">
      <header>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Account
        </div>
        <h1 className="mt-1 text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          User-level preferences only. Per-account controls live on each
          account's details page.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Identity
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono">{email ?? "—"}</span>
        </div>
      </section>

      <ChangeEmailCard current={email} />
      <ChangePasswordCard />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Security
        </div>
        <button
          onClick={signOut}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:border-loss/60 hover:text-loss"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </section>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary";

function ChangeEmailCard({ current }: { current: string | null }) {
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = next.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Enter a valid email address.");
      return;
    }
    if (value.toLowerCase() === (current ?? "").toLowerCase()) {
      toast.error("That's already your email.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: value });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNext("");
    toast.success(
      "Confirmation sent. Open the link in your new inbox to finish the change.",
    );
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Mail className="h-3 w-3" /> Change email
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        We'll email a confirmation link to the new address. Your old email keeps
        working until you confirm.
      </p>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <label className="block">
          <Label>New email</Label>
          <input
            type="email"
            autoComplete="email"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            className={inputCls}
          />
        </label>
        <button
          disabled={busy || !next}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send confirmation"}
        </button>
      </form>
    </section>
  );
}

function ChangePasswordCard() {
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextPw.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }
    if (nextPw !== confirmPw) {
      toast.error("New password and confirmation don't match.");
      return;
    }
    if (nextPw === currentPw) {
      toast.error("New password must differ from the current one.");
      return;
    }

    setBusy(true);
    // Supabase's updateUser doesn't verify the old password, so re-authenticate
    // first — otherwise anyone with an unlocked session could silently reset it.
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (!email) {
      setBusy(false);
      toast.error("Couldn't read your account email. Sign in again.");
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPw,
    });
    if (signInError) {
      setBusy(false);
      toast.error("Current password is incorrect.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: nextPw });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentPw("");
    setNextPw("");
    setConfirmPw("");
    toast.success("Password updated.");
  };

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
        <KeyRound className="h-3 w-3" /> Change password
      </div>
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <label className="block">
          <Label>Current password</Label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className={inputCls}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <Label>New password</Label>
            <input
              type="password"
              autoComplete="new-password"
              value={nextPw}
              onChange={(e) => setNextPw(e.target.value)}
              maxLength={72}
              className={inputCls}
            />
          </label>
          <label className="block">
            <Label>Confirm new password</Label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              maxLength={72}
              className={inputCls}
            />
          </label>
        </div>
        <button
          disabled={busy || !currentPw || !nextPw || !confirmPw}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
