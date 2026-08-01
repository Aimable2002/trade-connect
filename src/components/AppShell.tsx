import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Trophy,
  History,
  Wallet,
  Settings,
  LogOut,
  Activity,
  Award,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/masters", label: "Masters", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/challenges", label: "Challenges", icon: Award },
  { to: "/pricing", label: "Pricing", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop side nav */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm font-bold tracking-widest">COPYDESK</span>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2 rounded px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleSignOut}
          className="m-2 flex items-center gap-2 rounded px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-loss"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4 md:hidden">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-mono text-xs font-bold tracking-widest">COPYDESK</span>
          </div>
          <button onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-loss">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden pb-20 md:pb-0">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur md:hidden">
          <div className="grid grid-cols-4">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}