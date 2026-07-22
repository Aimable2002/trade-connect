import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Validating credentials", ms: 4000 },
  { label: "Reserving terminal instance", ms: 12000 },
  { label: "Connecting to broker server", ms: 15000 },
  { label: "Syncing balance and positions", ms: 10000 },
  { label: "Finalizing account", ms: 6000 },
];

export function ProgressStages({ active }: { active: boolean }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      const e = Date.now() - start;
      setElapsed(e);
      let acc = 0;
      for (let i = 0; i < STAGES.length; i++) {
        acc += STAGES[i].ms;
        if (e < acc) {
          setStep(i);
          return;
        }
      }
      setStep(STAGES.length - 1);
    }, 250);
    return () => clearInterval(timer);
  }, [active]);

  const totalTypicalMs = STAGES.reduce((acc, s) => acc + s.ms, 0);
  const isSlow = elapsed > totalTypicalMs;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Spinning up your terminal</div>
        <div className="font-mono tabular text-xs text-muted-foreground">
          {Math.floor(elapsed / 1000)}s
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Provisioning a live MT5 connection typically takes 30–60 seconds. Keep this tab open.
      </p>
      {isSlow && (
        <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] leading-relaxed text-warning">
          Still working — this one's taking longer than usual. Broker or terminal availability can
          add a couple of minutes. We'll keep waiting for up to 5 minutes; there's no need to
          resubmit or close the tab.
        </p>
      )}
      <ul className="space-y-2 pt-1">
        {STAGES.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={s.label}
              className={cn(
                "flex items-center gap-2 text-xs",
                done && "text-foreground",
                current && "text-primary",
                !done && !current && "text-muted-foreground/60",
              )}
            >
              <span className="grid h-4 w-4 place-items-center">
                {done ? (
                  <Check className="h-3.5 w-3.5 text-profit" />
                ) : current ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                )}
              </span>
              <span className="font-mono tabular text-[11px]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}