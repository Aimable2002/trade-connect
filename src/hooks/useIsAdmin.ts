import { useSession } from "@/hooks/useSession";

/**
 * Admin status comes from `app_metadata.is_admin` on the Supabase auth user -
 * NOT `user_metadata`. app_metadata can only be set server-side (Supabase
 * dashboard, or the admin API with the service-role key); a signed-in user
 * has no way to write to their own app_metadata, so it's safe to trust here
 * on the client. This must be paired with a matching RLS policy on any
 * table admin actions touch (e.g. `challenges`) that checks the same claim
 * server-side - this hook only controls what the UI shows, it doesn't (and
 * can't) enforce anything by itself.
 */
export function useIsAdmin() {
  const { session, loading } = useSession();
  const isAdmin = session?.user?.app_metadata?.is_admin === true;
  return { isAdmin, loading };
}
