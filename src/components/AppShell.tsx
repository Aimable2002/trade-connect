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
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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
  { to: "/admin", label: "Admin", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/** Items pinned to the mobile bottom bar; everything else lives behind Menu. */
const MOBILE_PRIMARY = ["/dashboard", "/masters", "/leaderboard"] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  // Any navigation should dismiss the sheet, including back/forward.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const primary = NAV.filter((n) => (MOBILE_PRIMARY as readonly string[]).includes(n.to));
  const secondary = NAV.filter((n) => !(MOBILE_PRIMARY as readonly string[]).includes(n.to));
  const menuActive = secondary.some((n) => pathname.startsWith(n.to));

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
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className="text-xs text-muted-foreground hover:text-loss"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 overflow-x-hidden pb-24 md:pb-0">{children}</main>

        {/* Mobile menu sheet */}
        {menuOpen && (
          <div className="fixed inset-0 z-30 md:hidden">
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-card pb-[calc(env(safe-area-inset-bottom)+5rem)] shadow-lg">
              <div className="flex items-center justify-between px-4 pb-2 pt-3">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  More
                </span>
                <button
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded p-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="grid grid-cols-2 gap-2 px-3 pb-3">
                {secondary.map((n) => {
                  const active = pathname.startsWith(n.to);
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-3 text-sm",
                        active
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background/60 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{n.label}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={handleSignOut}
                  className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-loss/30 bg-loss/5 px-3 py-3 text-sm text-loss"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="grid grid-cols-4">
            {primary.map((n) => {
              const active = pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px]",
                menuOpen || menuActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              Menu
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
