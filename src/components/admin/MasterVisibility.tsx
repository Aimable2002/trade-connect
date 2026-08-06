import { Loader2 } from "lucide-react";

/** Shared bits for the admin master public/private listing control. */
export function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest ${
        isPublic
          ? "border-profit/40 bg-profit/10 text-profit"
          : "border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      {isPublic ? "public" : "private"}
    </span>
  );
}

export function PublicToggle({
  isPublic,
  pending,
  onChange,
}: {
  isPublic: boolean;
  pending: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={isPublic}
      aria-label="Public listing"
      disabled={pending}
      onClick={() => onChange(!isPublic)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 ${
        isPublic ? "border-profit/50 bg-profit/25" : "border-border bg-muted/50"
      }`}
    >
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground transition-transform ${
          isPublic ? "translate-x-6" : "translate-x-1"
        }`}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin text-background" />}
      </span>
    </button>
  );
}
