import { cn } from "@/lib/utils";

export function RoleBadge({ role }: { role: "master" | "follower" | string }) {
  const isMaster = role === "master";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-widest",
        isMaster
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-muted text-foreground border border-border",
      )}
    >
      {role?.toUpperCase()}
    </span>
  );
}
