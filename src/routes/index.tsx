import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  component: IndexRedirect,
});

function IndexRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate({
        to: data.session ? "/dashboard" : "/auth",
        replace: true,
      });
    });
  }, [navigate]);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Activity className="h-4 w-4 animate-pulse text-primary" />
        <span className="font-mono text-xs tracking-widest">LOADING</span>
      </div>
    </div>
  );
}
