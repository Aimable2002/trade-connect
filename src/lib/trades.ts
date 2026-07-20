import type { Deal } from "./api";

// Parse MT5 deal_time "YYYY.MM.DD HH:MM:SS" (UTC broker time) to a Date.
export function parseDealTime(s: string): Date {
  // Turn "2026.07.19 03:52:57" into "2026-07-19T03:52:57Z"
  const [d, t] = s.split(" ");
  if (!d || !t) return new Date(s);
  return new Date(`${d.replace(/\./g, "-")}T${t}Z`);
}

export interface RoundTrip {
  key: string;
  symbol: string;
  side: string; // side of the OPEN deal
  lots: number;
  openTime: Date;
  closeTime: Date;
  openPrice: number;
  closePrice: number;
  pnl: number;
  commission: number;
  swap: number;
  net: number;
  openTicket: string;
  closeTicket: string;
}

/**
 * Pair MT5 "in"/"out" deals into round-trip trades.
 * Matches on symbol + lots + comment when available, otherwise FIFO within a symbol.
 * Deals with entry !== "in"/"out" are ignored (returned separately by caller).
 */
export function pairDeals(deals: Deal[]): {
  trips: RoundTrip[];
  unpaired: Deal[];
} {
  const sorted = [...deals].sort(
    (a, b) => parseDealTime(a.deal_time).getTime() - parseDealTime(b.deal_time).getTime(),
  );

  const opensBySymbol = new Map<string, Deal[]>();
  const trips: RoundTrip[] = [];
  const unpaired: Deal[] = [];

  for (const d of sorted) {
    if (d.entry === "in") {
      const arr = opensBySymbol.get(d.symbol) ?? [];
      arr.push(d);
      opensBySymbol.set(d.symbol, arr);
    } else if (d.entry === "out") {
      const arr = opensBySymbol.get(d.symbol) ?? [];
      // Prefer same lots + comment; fall back to same lots; then FIFO
      let idx = arr.findIndex(
        (o) => o.lots === d.lots && !!d.comment && o.comment === d.comment,
      );
      if (idx < 0) idx = arr.findIndex((o) => o.lots === d.lots);
      if (idx < 0) idx = 0;
      const open = arr[idx];
      if (!open) {
        unpaired.push(d);
        continue;
      }
      arr.splice(idx, 1);
      opensBySymbol.set(d.symbol, arr);
      trips.push({
        key: `${open.deal_ticket}-${d.deal_ticket}`,
        symbol: d.symbol,
        side: open.type,
        lots: d.lots,
        openTime: parseDealTime(open.deal_time),
        closeTime: parseDealTime(d.deal_time),
        openPrice: open.deal_price,
        closePrice: d.deal_price,
        pnl: d.pnl,
        commission: (open.commission ?? 0) + (d.commission ?? 0),
        swap: (open.swap ?? 0) + (d.swap ?? 0),
        net: d.pnl + (open.commission ?? 0) + (d.commission ?? 0) + (open.swap ?? 0) + (d.swap ?? 0),
        openTicket: open.deal_ticket,
        closeTicket: d.deal_ticket,
      });
    } else {
      unpaired.push(d);
    }
  }

  // Any unmatched opens remain "open"; leave them out of `trips` — caller can decide.
  for (const [, arr] of opensBySymbol) unpaired.push(...arr);

  return { trips, unpaired };
}

/** Sum of net P&L over the last N days from a deals array. */
export function computeReturnAbs(deals: Deal[], days: number): number {
  const cutoff = Date.now() - days * 86400_000;
  return deals
    .filter((d) => d.entry === "out" && parseDealTime(d.deal_time).getTime() >= cutoff)
    .reduce((acc, d) => acc + d.pnl + (d.commission ?? 0) + (d.swap ?? 0), 0);
}

/** Count of closed round-trips over the last N days. */
export function countClosed(deals: Deal[], days: number): number {
  const cutoff = Date.now() - days * 86400_000;
  return deals.filter(
    (d) => d.entry === "out" && parseDealTime(d.deal_time).getTime() >= cutoff,
  ).length;
}

/** Win rate (0..1) over the last N days, based on out-deal pnl > 0. */
export function winRate(deals: Deal[], days: number): number | null {
  const cutoff = Date.now() - days * 86400_000;
  const closes = deals.filter(
    (d) => d.entry === "out" && parseDealTime(d.deal_time).getTime() >= cutoff,
  );
  if (closes.length === 0) return null;
  const wins = closes.filter((d) => d.pnl > 0).length;
  return wins / closes.length;
}
