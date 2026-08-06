import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { setAdminMasterPublic, type AdminMasterListItem } from "@/lib/api";
import { adminMastersQueryOptions } from "@/lib/queries";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, PatientLoader } from "@/components/DataState";
import { PublicToggle, VisibilityBadge } from "@/components/admin/MasterVisibility";

export const Route = createFileRoute("/_app/admin/masters/")({
  head: () => ({
    meta: [
      { title: "Master listings — CopyDesk Admin" },
      {
        name: "description",
        content:
          "Review every CopyDesk master and control which profiles are listed publicly in the directory.",
      },
      { property: "og:title", content: "Master listings — CopyDesk Admin" },
      {
        property: "og:description",
        content: "Admin control over public/private master directory listings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminMastersPage,
});

type Tab = "all" | "public" | "private";

function AdminMastersPage() {
  return (
    <AdminGate>
      <AdminMastersContent />
    </AdminGate>
  );
}

function AdminMastersContent() {
  const { data, isLoading, error, refetch } = useQuery(adminMastersQueryOptions());
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const masters = data ?? [];
  const filtered = useMemo(
    () =>
      masters.filter(
        (m) =>
          (tab === "all" ||
            (tab === "public" && m.is_public) ||
            (tab === "private" && !m.is_public)) &&
          (q === "" ||
            m.display_name.toLowerCase().includes(q.toLowerCase()) ||
            m.account_id.toLowerCase().includes(q.toLowerCase())),
      ),
    [masters, tab, q],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <header className="space-y-2">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Admin console
        </Link>
        <h1 className="font-mono text-lg font-bold tracking-widest md:text-xl">MASTER LISTINGS</h1>
        <p className="text-xs text-muted-foreground">
          Every master profile, listed or not. Toggling a master public places them in the
          directory; revoking removes them immediately.
        </p>
      </header>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or account id"
          className="min-w-0 rounded-md border border-border bg-input px-3 py-2 text-xs outline-none focus:border-primary"
        />
        <div className="flex gap-1">
          {(["all", "public", "private"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md border px-3 py-2 text-[11px] capitalize ${
                tab === t
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <PatientLoader label="Loading masters…" />}
      {error && (
        <ErrorState message={`Couldn't load masters: ${(error as Error).message}`} onRetry={() => refetch()} />
      )}

      {data && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
          No masters match this filter.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((m) => (
          <MasterRow key={m.account_id} master={m} />
        ))}
      </div>
    </div>
  );
}

function MasterRow({ master }: { master: AdminMasterListItem }) {
  const qc = useQueryClient();

  const toggle = useMutation({
    mutationFn: (next: boolean) => setAdminMasterPublic(master.account_id, next),
    onSuccess: (res) => {
      qc.setQueryData<AdminMasterListItem[]>(["admin", "masters"], (prev) =>
        (prev ?? []).map((m) =>
          m.account_id === res.account_id ? { ...m, is_public: res.is_public } : m,
        ),
      );
      qc.invalidateQueries({ queryKey: ["admin", "masters", master.account_id] });
      qc.invalidateQueries({ queryKey: ["masters", "directory"] });
      toast.success(res.is_public ? "Master is now public" : "Public listing revoked");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-3">
      <Link
        to="/admin/masters/$accountId"
        params={{ accountId: master.account_id }}
        className="group min-w-0"
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium group-hover:text-primary">
            {master.display_name || "Unnamed master"}
          </span>
          <VisibilityBadge isPublic={master.is_public} />
        </div>
        <div className="truncate font-mono text-[10px] text-muted-foreground">
          {master.account_id}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
          <span>{master.account_status}</span>
          <span>{master.rate_percent === null ? "no rate" : `${master.rate_percent}% rate`}</span>
          <span>
            {master.follower_count} follower{master.follower_count === 1 ? "" : "s"}
          </span>
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <PublicToggle
          isPublic={master.is_public}
          pending={toggle.isPending}
          onChange={(next) => toggle.mutate(next)}
        />
        <Link
          to="/admin/masters/$accountId"
          params={{ accountId: master.account_id }}
          className="rounded border border-border p-1.5 text-muted-foreground hover:text-foreground"
          aria-label={`Open ${master.display_name || master.account_id}`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
