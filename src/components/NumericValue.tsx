import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null | undefined;
  format?: "currency" | "number" | "percent" | "signed";
  decimals?: number;
  className?: string;
  flash?: boolean;
}

function formatValue(
  v: number | null | undefined,
  format: Props["format"],
  decimals = 2,
) {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const opts: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  };
  if (format === "currency") {
    return `$${new Intl.NumberFormat("en-US", opts).format(v)}`;
  }
  if (format === "percent") {
    return `${new Intl.NumberFormat("en-US", opts).format(v)}%`;
  }
  if (format === "signed") {
    const s = new Intl.NumberFormat("en-US", opts).format(Math.abs(v));
    return v >= 0 ? `+${s}` : `−${s}`;
  }
  return new Intl.NumberFormat("en-US", opts).format(v);
}

export function NumericValue({
  value,
  format = "number",
  decimals = 2,
  className,
  flash = true,
}: Props) {
  const [flashing, setFlashing] = useState(false);
  const prev = useRef<number | null | undefined>(value);
  useEffect(() => {
    if (!flash) return;
    if (prev.current !== value && prev.current !== undefined) {
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 500);
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, flash]);

  return (
    <span
      className={cn(
        "font-mono tabular rounded px-0.5 transition-colors",
        flashing && "flash-update",
        className,
      )}
    >
      {formatValue(value, format, decimals)}
    </span>
  );
}
