import type { Deal } from "./api";

export function parseDealTime(s: string): Date {
  const [d, t] = s.split(" ");
  if (!d || !t) return new Date(s);
  return new Date(`${d.replace(/\./g, "-")}T${t}Z`);
}

export interface RoundTrip {
  key: string;
  symbol: string;
  side: string;
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

export function pairDeals(deals: Deal[]): {
  trips: RoundTrip[];
  unpaired: Deal[];
} {
  const sorted = [...deals].sort(
    (a, b) =>
      parseDealTime(a.deal_time).getTime() -
      parseDealTime(b.deal_time).getTime(),
  );

  const opensBySymbol = new Map<string, Deal[]>();
  const trips: RoundTrip[] = [];
  const unpaired: Deal[] = [];

  for (const d of sorted) {
    if (d.entry === "in" || d.entry === "entry_in") {
      const arr = opensBySymbol.get(d.symbol) ?? [];
      arr.push(d);
      opensBySymbol.set(d.symbol, arr);
    } else if (d.entry === "out" || d.entry === "entry_out") {
      const arr = opensBySymbol.get(d.symbol) ?? [];
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
        net:
          d.pnl +
          (open.commission ?? 0) +
          (d.commission ?? 0) +
          (open.swap ?? 0) +
          (d.swap ?? 0),
        openTicket: open.deal_ticket,
        closeTicket: d.deal_ticket,
      });
    } else {
      unpaired.push(d);
    }
  }

  for (const [, arr] of opensBySymbol) unpaired.push(...arr);

  return { trips, unpaired };
}

function isClose(d: Deal): boolean {
  return d.entry === "out" || d.entry === "entry_out";
}

export function computeReturnAbs(deals: Deal[], days: number): number {
  const cutoff = Date.now() - days * 86400_000;
  return deals
    .filter(
      (d) =>
        isClose(d) && parseDealTime(d.deal_time).getTime() >= cutoff,
    )
    .reduce((acc, d) => acc + d.pnl + (d.commission ?? 0) + (d.swap ?? 0), 0);
}

export function countClosed(deals: Deal[], days: number): number {
  const cutoff = Date.now() - days * 86400_000;
  return deals.filter(
    (d) => isClose(d) && parseDealTime(d.deal_time).getTime() >= cutoff,
  ).length;
}

export function winRate(deals: Deal[], days: number): number | null {
  const cutoff = Date.now() - days * 86400_000;
  const closes = deals.filter(
    (d) => isClose(d) && parseDealTime(d.deal_time).getTime() >= cutoff,
  );
  if (closes.length === 0) return null;
  const wins = closes.filter((d) => d.pnl > 0).length;
  return wins / closes.length;
}

/** Sum of all deposits (deal.type === "balance" with positive pnl). */
export function startingBalance(deals: Deal[]): number | null {
  const deposits = deals.filter(
    (d) => d.type === "balance" && (d.pnl ?? 0) > 0,
  );
  if (deposits.length === 0) return null;
  return deposits.reduce((a, d) => a + d.pnl, 0);
}

export interface EquityPoint {
  time: Date;
  equity: number;
}

/** Running equity from deposits + realized close P&L, chronological order. */
export function equityCurve(deals: Deal[]): EquityPoint[] {
  const sorted = [...deals].sort(
    (a, b) =>
      parseDealTime(a.deal_time).getTime() -
      parseDealTime(b.deal_time).getTime(),
  );
  const points: EquityPoint[] = [];
  let eq = 0;
  for (const d of sorted) {
    if (d.type === "balance") {
      eq += d.pnl;
    } else if (isClose(d)) {
      eq += (d.pnl ?? 0) + (d.commission ?? 0) + (d.swap ?? 0);
    } else {
      continue;
    }
    points.push({ time: parseDealTime(d.deal_time), equity: eq });
  }
  return points;
}

/** Peak-to-trough max drawdown, absolute currency. */
export function maxDrawdownAbs(deals: Deal[]): number {
  const curve = equityCurve(deals);
  if (curve.length === 0) return 0;
  let peak = curve[0].equity;
  let dd = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    const drop = peak - p.equity;
    if (drop > dd) dd = drop;
  }
  return dd;
}

/** Max drawdown as % of running peak equity. */
export function maxDrawdownPct(deals: Deal[]): number | null {
  const curve = equityCurve(deals);
  if (curve.length === 0) return null;
  let peak = curve[0].equity;
  let ddPct = 0;
  for (const p of curve) {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const pct = ((peak - p.equity) / peak) * 100;
      if (pct > ddPct) ddPct = pct;
    }
  }
  return ddPct;
}

export function profitFactor(deals: Deal[]): number | null {
  const closes = deals.filter(isClose);
  if (closes.length === 0) return null;
  let gross = 0;
  let loss = 0;
  for (const d of closes) {
    const n = d.pnl + (d.commission ?? 0) + (d.swap ?? 0);
    if (n > 0) gross += n;
    else if (n < 0) loss += -n;
  }
  if (loss === 0) return gross > 0 ? Infinity : null;
  return gross / loss;
}

/** ROI% = totalNetPnL / startingBalance * 100 (over ALL deals). */
export function roiPct(deals: Deal[]): number | null {
  const start = startingBalance(deals);
  if (start === null || start === 0) return null;
  const total = deals
    .filter(isClose)
    .reduce((a, d) => a + d.pnl + (d.commission ?? 0) + (d.swap ?? 0), 0);
  return (total / start) * 100;
}

export function avgWin(deals: Deal[]): number | null {
  const wins = deals.filter((d) => isClose(d) && d.pnl > 0);
  if (wins.length === 0) return null;
  return wins.reduce((a, d) => a + d.pnl, 0) / wins.length;
}

export function avgLoss(deals: Deal[]): number | null {
  const losses = deals.filter((d) => isClose(d) && d.pnl < 0);
  if (losses.length === 0) return null;
  return losses.reduce((a, d) => a + d.pnl, 0) / losses.length;
}

export function returnDrawdownRatio(deals: Deal[]): number | null {
  const total = deals
    .filter(isClose)
    .reduce((a, d) => a + d.pnl + (d.commission ?? 0) + (d.swap ?? 0), 0);
  const dd = maxDrawdownAbs(deals);
  if (dd === 0) return total > 0 ? Infinity : null;
  return total / dd;
}

/** Days between earliest and latest deal. */
export function trackRecordDays(deals: Deal[]): number | null {
  if (deals.length === 0) return null;
  const times = deals.map((d) => parseDealTime(d.deal_time).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  return Math.max(1, Math.round((max - min) / 86400_000));
}

/** Sum of |lots| of currently open (unpaired) positions. */
export function openExposure(deals: Deal[]): number {
  const { unpaired } = pairDeals(deals);
  return unpaired
    .filter((d) => d.entry === "in" || d.entry === "entry_in")
    .reduce((a, d) => a + Math.abs(d.lots), 0);
}

export function bySymbol(
  deals: Deal[],
): Array<{ symbol: string; trades: number; net: number }> {
  const map = new Map<string, { trades: number; net: number }>();
  for (const d of deals) {
    if (!isClose(d) || !d.symbol) continue;
    const cur = map.get(d.symbol) ?? { trades: 0, net: 0 };
    cur.trades += 1;
    cur.net += d.pnl + (d.commission ?? 0) + (d.swap ?? 0);
    map.set(d.symbol, cur);
  }
  return Array.from(map.entries())
    .map(([symbol, v]) => ({ symbol, ...v }))
    .sort((a, b) => b.trades - a.trades);
}

/** Bucket close-deal counts by UTC hour of day (0..23). */
export function byHourOfDay(deals: Deal[]): number[] {
  const bins = new Array(24).fill(0) as number[];
  for (const d of deals) {
    if (!isClose(d)) continue;
    const h = parseDealTime(d.deal_time).getUTCHours();
    bins[h] += 1;
  }
  return bins;
}

/** Total net P&L (pnl + commission + swap) over all closed deals. */
export function netPnl(deals: Deal[]): number {
  return deals
    .filter(isClose)
    .reduce((a, d) => a + d.pnl + (d.commission ?? 0) + (d.swap ?? 0), 0);
}

/** Running cumulative net P&L from closed deals only, chronological. */
export function cumulativePnlCurve(deals: Deal[]): EquityPoint[] {
  const closes = deals
    .filter(isClose)
    .sort(
      (a, b) =>
        parseDealTime(a.deal_time).getTime() -
        parseDealTime(b.deal_time).getTime(),
    );
  let acc = 0;
  return closes.map((d) => {
    acc += d.pnl + (d.commission ?? 0) + (d.swap ?? 0);
    return { time: parseDealTime(d.deal_time), equity: acc };
  });
}
