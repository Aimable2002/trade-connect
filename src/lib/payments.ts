import type { PaymentCurrency, PaymentMethod } from "./api";

/**
 * Offline fallback used only until `GET /payments/currencies` answers.
 * `rate_per_usd: null` means "we do not know the rate client-side" — the UI
 * must then say the exact charge is confirmed at checkout rather than invent
 * a number. The backend (Flutterwave) is always the source of truth for both
 * the rate and the final charged amount.
 */
export const FALLBACK_CURRENCIES: PaymentCurrency[] = [
  { code: "USD", name: "US Dollar", rate_per_usd: 1, mobile_money: false, country: "US" },
  { code: "RWF", name: "Rwandan Franc", rate_per_usd: null, mobile_money: true, country: "RW" },
  { code: "KES", name: "Kenyan Shilling", rate_per_usd: null, mobile_money: true, country: "KE" },
  { code: "UGX", name: "Ugandan Shilling", rate_per_usd: null, mobile_money: true, country: "UG" },
  {
    code: "TZS",
    name: "Tanzanian Shilling",
    rate_per_usd: null,
    mobile_money: true,
    country: "TZ",
  },
  { code: "GHS", name: "Ghanaian Cedi", rate_per_usd: null, mobile_money: true, country: "GH" },
  {
    code: "XAF",
    name: "Central African CFA",
    rate_per_usd: null,
    mobile_money: true,
    country: "CM",
  },
  { code: "XOF", name: "West African CFA", rate_per_usd: null, mobile_money: true, country: "CI" },
  { code: "NGN", name: "Nigerian Naira", rate_per_usd: null, mobile_money: false, country: "NG" },
  {
    code: "ZAR",
    name: "South African Rand",
    rate_per_usd: null,
    mobile_money: false,
    country: "ZA",
  },
];

/** Mobile-money networks Flutterwave exposes, keyed by currency. */
export const MOBILE_NETWORKS: Record<string, string[]> = {
  RWF: ["MTN", "AIRTEL"],
  KES: ["MPESA", "AIRTEL"],
  UGX: ["MTN", "AIRTEL"],
  TZS: ["VODAFONE", "TIGO", "AIRTEL", "HALOPESA"],
  GHS: ["MTN", "VODAFONE", "AIRTELTIGO"],
  XAF: ["MTN", "ORANGE"],
  XOF: ["MTN", "ORANGE", "MOOV", "WAVE"],
};

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  mobilemoney: "Mobile money",
  banktransfer: "Bank transfer",
};

/** Zero-decimal currencies — showing "1200.00 RWF" reads wrong. */
const ZERO_DECIMAL = new Set(["RWF", "UGX", "XAF", "XOF", "JPY"]);

export function formatMoney(amount: number, currency: string): string {
  const decimals = ZERO_DECIMAL.has(currency) ? 0 : 2;
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return currency === "USD" ? `$${n}` : `${n} ${currency}`;
}

export function convert(amountUsd: number, currency: PaymentCurrency | undefined): number | null {
  if (!currency || currency.rate_per_usd === null || currency.rate_per_usd === undefined) {
    return null;
  }
  return amountUsd * currency.rate_per_usd;
}

export function methodsFor(currency: PaymentCurrency | undefined): PaymentMethod[] {
  const methods: PaymentMethod[] = ["card"];
  if (currency?.mobile_money) methods.unshift("mobilemoney");
  return methods;
}
