import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useSlowLoading } from "@/hooks/useSlowLoading";
import { cn } from "@/lib/utils";

/**
 * Standard "still loading" indicator. Shows a normal loading line first,
 * then — once the request has been running past `slowAfterMs` — expands
 * into a reassuring message that this can take a while and it is safe to
 * keep waiting, without ever implying something went wrong. The underlying
 * fetch itself has up to 5 minutes to resolve (see MAX_REQUEST_TIMEOUT_MS),
 * so this is never a false promise.
 */
export function PatientLoader({
  label = "Loading…",
  slowLabel,
  slowAfterMs = 8000,
  className,
  compact = false,
}: {
  label?: string;
  slowLabel?: string;
  slowAfterMs?: number;
  className?: string;
  compact?: boolean;
}) {
  const { isSlow, elapsedMs } = useSlowLoading(true, slowAfterMs);

  return (
    <div
      className={cn("rounded-lg border border-border bg-card", compact ? "p-3" : "p-4", className)}
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <span>{label}</span>
        {elapsedMs > 3000 && (
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            {Math.floor(elapsedMs / 1000)}s
          </span>
        )}
      </div>
      {isSlow && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          {slowLabel ??
            "Still working — this is taking longer than usual. No need to do anything, it'll come through. If it doesn't finish in a few minutes, refreshing the page is safe."}
        </p>
      )}
    </div>
  );
}

/**
 * Standard error state, shown only once a request has truly failed or
 * exhausted the 5-minute timeout — never on a merely-slow response.
 */
export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-loss/30 bg-loss/5 p-4", className)}>
      <div className="flex items-start gap-2 text-xs text-loss">
        <WifiOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0">
          <div>{message}</div>
          <div className="mt-1 text-[10px] text-loss/70">
            If this keeps happening, refreshing the page usually fixes it.
          </div>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-loss/40 px-2.5 py-1 text-[11px] font-medium text-loss hover:bg-loss/10"
        >
          <RefreshCw className="h-3 w-3" /> Try again
        </button>
      )}
    </div>
  );
}