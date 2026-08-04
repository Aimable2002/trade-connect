import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PatientLoader } from "@/components/DataState";

/**
 * Wrap any /admin page's component with this. It blocks the page itself for
 * non-admins - not just the nav link - so typing the URL directly doesn't
 * get anyone past the UI. The corresponding data writes (e.g. `challenges`
 * insert/update) still need an RLS policy on the same `app_metadata.is_admin`
 * claim on the Supabase side; this only protects the client UI.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return <PatientLoader label="Checking access…" className="m-4" />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 p-4 pt-16 text-center md:p-8">
        <ShieldAlert className="mx-auto h-8 w-8 text-loss" />
        <h1 className="text-sm font-semibold">Admin access only</h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This area is restricted to authorised platform administrators.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3.5 py-2.5 text-xs font-semibold hover:border-primary/60"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
