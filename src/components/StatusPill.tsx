import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const s = status?.toLowerCase() ?? "unknown";
  const config: Record<string, { label: string; color: string; dot: string }> = {
    live: {
      label: "LIVE",
      color: "text-profit border-profit/40 bg-profit/10",
      dot: "bg-profit",
    },
    offline: {
      label: "OFFLINE",
      color: "text-muted-foreground border-border bg-muted/40",
      dot: "bg-muted-foreground",
    },
    paused: {
      label: "PAUSED",
      color: "text-warning border-warning/40 bg-warning/10",
      dot: "bg-warning",
    },
    pending: {
      label: "PROVISIONING",
      color: "text-primary border-primary/40 bg-primary/10",
      dot: "bg-primary animate-pulse",
    },
  };
  const c = config[s] ?? {
    label: s.toUpperCase(),
    color: "text-muted-foreground border-border bg-muted/40",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider",
        c.color,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
