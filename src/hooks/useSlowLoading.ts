import { useEffect, useState } from "react";

/**
 * Tracks how long a loading state has been active and reports whether it has
 * run past `slowAfterMs`. This never cancels or times out anything itself —
 * it only tells the UI when to switch from a plain "Loading…" message to a
 * "this is taking longer than expected" message, so the person always sees
 * an honest, still-loading state instead of a premature error.
 *
 * The actual network requests are still bounded by MAX_REQUEST_TIMEOUT_MS
 * (5 minutes) in src/lib/api.ts — this hook is purely cosmetic.
 */
export function useSlowLoading(isActive: boolean, slowAfterMs = 8000) {
  const [isSlow, setIsSlow] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setIsSlow(false);
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const e = Date.now() - start;
      setElapsedMs(e);
      if (e >= slowAfterMs) setIsSlow(true);
    }, 500);
    return () => clearInterval(interval);
  }, [isActive, slowAfterMs]);

  return { isSlow, elapsedMs };
}