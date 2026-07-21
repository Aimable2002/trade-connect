import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut, Mail } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [notifyFills, setNotifyFills] = useState(true);
  const [notifyBilling, setNotifyBilling] = useState(true);

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

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Notifications
        </div>
        <div className="mt-3 space-y-3">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notifyFills}
              onChange={(e) => setNotifyFills(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div>
              <div className="text-sm">Fill notifications</div>
              <div className="text-[11px] text-muted-foreground">
                Get notified when a copy fills or a stop-out occurs.
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={notifyBilling}
              onChange={(e) => setNotifyBilling(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <div>
              <div className="text-sm">Billing & wallet notifications</div>
              <div className="text-[11px] text-muted-foreground">
                Low balance, grace period, subscription renewal.
              </div>
            </div>
          </label>
          <div className="text-[10px] text-muted-foreground/70">
            Preferences are local only for now.
          </div>
        </div>
      </section>

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
