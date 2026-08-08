import { supabase, type SizingMode } from "./supabase";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://surviving-cork-lushness.ngrok-free.dev";

export interface ProvisionMasterInput {
  role: "master";
  login: string;
  password: string;
  server: string;
}

export interface ProvisionFollowerInput {
  role: "follower";
  login: string;
  password: string;
  server: string;
  master_account_id: string;
  multiplier: number;
  sizing_mode: SizingMode;
}

export type ProvisionInput = ProvisionMasterInput | ProvisionFollowerInput;

export interface ProvisionResponse {
  account_id: string;
  status: string;
}

export class ProvisionError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ProvisionError";
  }
}

export const ApiError = ProvisionError;
export type ApiError = ProvisionError;

interface RequestOpts {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

// Hard ceiling for every request in the app. Nothing should ever abort
// before this — slow backend/MT5 round-trips are normal, not errors.
// Call sites may still pass a smaller "expected" timeoutMs purely for UI
// messaging purposes, but it is clamped up to this floor so a fetch is
// never cut short just because it's taking longer than usual.
export const MAX_REQUEST_TIMEOUT_MS = 5 * 60_000; // 5 minutes

async function authedFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ProvisionError("You must be signed in.", 401);

  const effectiveTimeout = Math.max(
    opts.timeoutMs ?? MAX_REQUEST_TIMEOUT_MS,
    MAX_REQUEST_TIMEOUT_MS,
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeout);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if ((e as Error).name === "AbortError") {
      throw new ProvisionError(
        "Still no response after 5 minutes. The server may be under heavy load — please refresh the page and try again.",
      );
    }
    throw new ProvisionError(`Could not reach server: ${(e as Error).message}`);
  }
  clearTimeout(timeout);

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-json
  }

  if (!res.ok) {
    const detail =
      (body && typeof body === "object" && "detail" in body
        ? String((body as { detail: unknown }).detail)
        : null) ||
      text ||
      `Request failed with status ${res.status}`;
    throw new ProvisionError(detail, res.status);
  }

  return body as T;
}

export async function provisionAccount(input: ProvisionInput): Promise<ProvisionResponse> {
  return authedFetch<ProvisionResponse>("/accounts/provision", {
    method: "POST",
    body: input,
    timeoutMs: 90_000,
  });
}

// -------- cTrader master onboarding --------
//
// Unlike provisionAccount above, this doesn't provision anything itself - it
// only gets a Spotware authorization_url. The caller must do a full-page
// redirect (window.location.href = res.authorization_url), not treat this
// like a normal mutation result, since the consent step happens on
// Spotware's own hosted page, not in this app. See
// copydesk_fanout/api/api_server.py's /accounts/ctrader/start and
// /accounts/ctrader/callback for the backend side of this flow.

export interface CtraderStartResponse {
  authorization_url: string;
}

export async function startCtraderConnection(): Promise<CtraderStartResponse> {
  return authedFetch<CtraderStartResponse>("/accounts/ctrader/start", {
    method: "POST",
  });
}

// -------- Account lifecycle --------

export interface PauseResponse {
  account_id: string;
  status: string;
  closed_fills: number;
}

export interface StatusResponse {
  account_id: string;
  status: string;
  closed_fills?: number;
}

export const pauseAccount = (accountId: string, force_close: boolean) =>
  authedFetch<PauseResponse>(`/accounts/${accountId}/pause`, {
    method: "POST",
    body: { force_close },
    timeoutMs: 30_000,
  });

export const resumeAccount = (accountId: string) =>
  authedFetch<StatusResponse>(`/accounts/${accountId}/resume`, {
    method: "POST",
    timeoutMs: 30_000,
  });

export const closeAccount = (accountId: string) =>
  authedFetch<StatusResponse>(`/accounts/${accountId}/close`, {
    method: "POST",
    timeoutMs: 30_000,
  });

// -------- Master profile / directory --------

// `is_public` is platform-derived (granted once a master is verified), never
// master-set, so it is deliberately absent from the writable input shape.
export interface MasterProfileInput {
  display_name: string;
  bio?: string;
}

export interface MasterProfile {
  account_id: string;
  display_name: string;
  bio?: string;
  is_public: boolean;
}

export const upsertMasterProfile = (accountId: string, input: MasterProfileInput) =>
  authedFetch<MasterProfile>(`/masters/${accountId}/profile`, {
    method: "POST",
    body: input,
    timeoutMs: 15_000,
  });

// Reads THIS account's own profile regardless of is_public - the directory
// endpoint below only ever returns already-public masters, so it can't be
// used to pre-fill an editor for a private (or never-saved) profile. 404
// means "no profile saved yet" (a genuinely blank editor), not an error -
// see how this is consumed in masterProfileQueryOptions.
export const getMasterProfile = (accountId: string) =>
  authedFetch<MasterProfile>(`/masters/${accountId}/profile`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export interface DirectoryMaster {
  account_id: string;
  display_name: string;
  bio?: string;
  rate_percent?: number;
  platform?: "mt5" | "ctrader";
}

export const getMastersDirectory = () =>
  authedFetch<DirectoryMaster[]>("/masters/directory", {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Master rate --------

// The platform's cut is not something a master sets — it is a fixed 10% of
// whatever cut rate the master chooses to charge followers. A master who
// charges a 20% performance fee keeps 90% of that (18%), and the platform
// takes 10% of that fee (2%). This constant exists purely so the frontend
// can preview the split before saving; the backend is the source of truth.
export const PLATFORM_FEE_OF_MASTER_CUT_PCT = 10;

export interface MasterRate {
  account_id: string;
  rate_percent: number;
  platform_cut_percent: number;
  master_net_percent: number;
}

export const getMasterRate = (accountId: string) =>
  authedFetch<MasterRate>(`/masters/${accountId}/rate`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const setMasterRate = (
  accountId: string,
  input: { rate_percent: number; platform_cut_percent: number },
) =>
  authedFetch<MasterRate>(`/masters/${accountId}/rate`, {
    method: "POST",
    body: input,
    timeoutMs: 15_000,
  });

// -------- Master earnings --------

export interface EarningEntry {
  amount: number;
  created_at: string;
  related_follower_account_id?: string;
  related_deal_ticket?: string;
}

export interface MasterEarnings {
  total_earned: number;
  transaction_count: number;
  recent: EarningEntry[];
}

export const getMasterEarnings = (accountId: string) =>
  authedFetch<MasterEarnings>(`/masters/${accountId}/earnings`, {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Follower wallet --------

export interface Wallet {
  balance: number;
  in_debt: boolean;
  debt_started_at: string | null;
  exists: boolean;
}

export type WalletTxType =
  | "topup"
  | "infra_fee"
  | "slot_fee"
  | "profit_share_platform"
  | "profit_share_master"
  | "debt_recovery";

export interface WalletTransaction {
  type: WalletTxType | string;
  amount: number;
  related_master_account_id?: string | null;
  related_deal_ticket?: string | null;
  created_at: string;
}

export const getWallet = (accountId: string) =>
  authedFetch<Wallet>(`/accounts/${accountId}/wallet`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const topupWallet = (accountId: string, amount: number) =>
  authedFetch<Wallet>(`/accounts/${accountId}/wallet/topup`, {
    method: "POST",
    body: { amount },
    timeoutMs: 15_000,
  });

export const getWalletTransactions = (accountId: string) =>
  authedFetch<WalletTransaction[]>(`/accounts/${accountId}/wallet/transactions`, {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Follower billing --------

export type BillingStatus = "active" | "grace" | "closed" | string;

export interface BillingNone {
  status: "none";
}
export interface BillingPeriod {
  status: BillingStatus;
  package_code: string;
  renews_at?: string | null;
  grace_started_at?: string | null;
  billing_period_id?: string;
}

export type Billing = BillingNone | BillingPeriod;

export const getBilling = (accountId: string) =>
  authedFetch<Billing>(`/accounts/${accountId}/billing`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const selectPackage = (accountId: string, package_code: string) =>
  authedFetch<BillingPeriod>(`/accounts/${accountId}/billing/select-package`, {
    method: "POST",
    body: { package_code },
    timeoutMs: 20_000,
  });

export const reactivateBilling = (accountId: string, package_code: string) =>
  authedFetch<BillingPeriod>(`/accounts/${accountId}/billing/reactivate`, {
    method: "POST",
    body: { package_code },
    timeoutMs: 20_000,
  });

// -------- Follower roster --------

export interface RosterSlot {
  master_account_id: string;
  is_current: boolean;
  first_used_at: string;
  last_used_at: string;
}

export interface RosterResponse {
  billing_period_id: string;
  roster: RosterSlot[];
}

export interface SwitchMasterResponse {
  charged: boolean;
  roster_slot_id: string;
  rate_percent: number;
}

export const getRoster = (accountId: string) =>
  authedFetch<RosterResponse>(`/accounts/${accountId}/roster`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const switchMaster = (accountId: string, master_account_id: string) =>
  authedFetch<SwitchMasterResponse>(`/accounts/${accountId}/roster/switch`, {
    method: "POST",
    body: { master_account_id },
    timeoutMs: 20_000,
  });

// -------- Trades --------

export interface Deal {
  deal_ticket: string;
  magic: number;
  symbol: string;
  lots: number;
  type: string;
  entry: string;
  deal_time: string;
  deal_price: number;
  pnl: number;
  commission: number;
  swap: number;
  comment: string;
}

export const getAccountTrades = (accountId: string) =>
  authedFetch<Deal[]>(`/accounts/${accountId}/trades`, {
    method: "GET",
    timeoutMs: 20_000,
  });

export const getMasterTrades = (accountId: string) =>
  authedFetch<Deal[]>(`/masters/${accountId}/trades`, {
    method: "GET",
    timeoutMs: 20_000,
  });
// -------- Challenges --------

/**
 * `criteria` is a jsonb column with no fixed schema: admins can define
 * arbitrary criterion keys, so this stays an open record rather than a
 * closed interface. Rendering helpers live in `lib/challenges.ts`.
 */
export type ChallengeCriteria = Record<string, unknown>;

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  is_fixed: boolean;
  criteria: ChallengeCriteria;
  reward_amount: number;
  active: boolean;
  created_at: string;
}

export interface ChallengeEnrollment {
  id: string;
  master_account_id: string;
  challenge_id: string;
  status?: string | null;
  enrolled_at?: string | null;
  left_at?: string | null;
  challenge?: Challenge | null;
  challenge_name?: string | null;
}

export type ChallengePhase = "challenger" | "graduated";

export interface ChallengeStatusResponse {
  master_account_id: string;
  phase: ChallengePhase;
  current_enrollment: ChallengeEnrollment | null;
}

export interface ChallengeMonthlyResult {
  id: string;
  master_account_id: string;
  challenge_id: string;
  challenge_name: string | null;
  period?: string | null;
  passed?: boolean | null;
  reward_paid?: number | null;
  metrics?: Record<string, unknown> | null;
  note?: string | null;
  created_at?: string | null;
}

export interface ChallengeHistoryResponse {
  master_account_id: string;
  enrollments: ChallengeEnrollment[];
  monthly_results: ChallengeMonthlyResult[];
}

export const getChallenges = () =>
  authedFetch<{ challenges: Challenge[] }>(`/challenges`, {
    method: "GET",
    timeoutMs: 15_000,
  }).then((r) => r.challenges ?? []);

export const enrollInChallenge = (accountId: string, challenge_id: string) =>
  authedFetch<ChallengeEnrollment>(`/masters/${accountId}/challenges/enroll`, {
    method: "POST",
    body: { challenge_id },
    timeoutMs: 20_000,
  });

export const leaveChallenge = (accountId: string, challengeId: string) =>
  authedFetch<ChallengeEnrollment>(`/masters/${accountId}/challenges/${challengeId}/leave`, {
    method: "POST",
    timeoutMs: 20_000,
  });

export const getChallengeStatus = (accountId: string) =>
  authedFetch<ChallengeStatusResponse>(`/masters/${accountId}/challenges/status`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const getChallengeHistory = (accountId: string) =>
  authedFetch<ChallengeHistoryResponse>(`/masters/${accountId}/challenges/history`, {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Payments (Flutterwave, backend-handled) --------
//
// Prices in this product are denominated in USD. The backend owns the FX
// conversion and the Flutterwave call; the frontend only asks what a given
// USD amount costs in the payer's currency and then hands off to the hosted
// checkout link the backend returns. Route names below are ours to choose —
// they must be implemented server-side to match.

export type PaymentMethod = "card" | "mobilemoney" | "banktransfer";

export interface PaymentCurrency {
  code: string;
  name: string;
  /** Units of this currency per 1 USD. `null` = backend prices at checkout. */
  rate_per_usd: number | null;
  mobile_money: boolean;
  country?: string;
}

export type PaymentPurpose = "wallet_topup" | "package";

export interface CreatePaymentInput {
  account_id: string;
  purpose: PaymentPurpose;
  /** Required for wallet_topup. For `package` the backend prices the package. */
  amount_usd?: number;
  package_code?: string;
  currency: string;
  method: PaymentMethod;
  /** Mobile money only. */
  phone_number?: string;
  network?: string;
  /** Where Flutterwave should send the payer back to. */
  redirect_url: string;
}

export type PaymentStatus = "pending" | "successful" | "failed" | "cancelled" | string;

export interface PaymentIntent {
  reference: string;
  status: PaymentStatus;
  amount_usd: number;
  amount_charged: number;
  currency: string;
  method: PaymentMethod;
  /** Hosted Flutterwave checkout to redirect to (absent for some MoMo flows). */
  checkout_url?: string | null;
  /** Set once the wallet/billing side effect has been applied. */
  credited?: boolean;
  message?: string | null;
}

export const getPaymentCurrencies = () =>
  authedFetch<{ currencies: PaymentCurrency[] }>("/payments/currencies", {
    method: "GET",
    timeoutMs: 15_000,
  }).then((r) => r.currencies ?? []);

export const quotePayment = (input: { amount_usd: number; currency: string }) =>
  authedFetch<{ amount_usd: number; amount_charged: number; currency: string; rate: number }>(
    "/payments/quote",
    { method: "POST", body: input, timeoutMs: 15_000 },
  );

export const createPayment = (input: CreatePaymentInput) =>
  authedFetch<PaymentIntent>("/payments/checkout", {
    method: "POST",
    body: input,
    timeoutMs: 30_000,
  });

export const getPayment = (reference: string) =>
  authedFetch<PaymentIntent>(`/payments/${reference}`, {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Admin: live analytics + master management --------
//
// These are admin-only routes: the backend independently re-verifies the
// `app_metadata.is_admin` claim on the bearer token and returns 403 without
// it, so the client-side <AdminGate> is UX, not the security boundary.
// Deliberately kept separate from DirectoryMaster / MasterEarnings: the
// public directory surface and the admin surface evolve independently.

export interface AdminSummary {
  mrr: number;
  mrr_change_pct: number;
  accounts_total: number;
  masters_count: number;
  followers_count: number;
  payouts_pending_amount: number;
  payouts_pending_count: number;
  at_risk_wallets_count: number;
}

export const getAdminSummary = () =>
  authedFetch<AdminSummary>("/admin/summary", { method: "GET", timeoutMs: 15_000 });

export interface AdminRevenuePoint {
  month: string;
  infra: number;
  slots: number;
  profit_share: number;
}

export const getAdminRevenue = () =>
  authedFetch<AdminRevenuePoint[]>("/admin/analytics/revenue", {
    method: "GET",
    timeoutMs: 15_000,
  });

export interface AdminGrowthPoint {
  month: string;
  masters: number;
  followers: number;
}

export const getAdminGrowth = () =>
  authedFetch<AdminGrowthPoint[]>("/admin/analytics/growth", {
    method: "GET",
    timeoutMs: 15_000,
  });

export interface AdminSymbolExposure {
  symbol: string;
  lots: number;
  position_count: number;
}

export const getAdminSymbolExposure = () =>
  authedFetch<AdminSymbolExposure[]>("/admin/analytics/symbol-exposure", {
    method: "GET",
    timeoutMs: 15_000,
  });

export interface AdminTopMaster {
  account_id: string;
  name: string;
  followers: number;
  revenue: number;
  rate_percent: number | null;
  billed_pnl: number;
}

export const getAdminTopMasters = () =>
  authedFetch<AdminTopMaster[]>("/admin/analytics/top-masters", {
    method: "GET",
    timeoutMs: 15_000,
  });

export interface AdminUserRow {
  account_id: string;
  role: "master" | "follower";
  status: string;
  joined: string;
  lifetime_value: number;
}

export const getAdminUsers = () =>
  authedFetch<AdminUserRow[]>("/admin/users", { method: "GET", timeoutMs: 15_000 });

export interface AdminMasterListItem {
  account_id: string;
  display_name: string;
  bio: string | null;
  is_public: boolean;
  account_status: string;
  rate_percent: number | null;
  follower_count: number;
  platform?: "mt5" | "ctrader";
}

export interface AdminMasterRate {
  rate_percent: number;
  platform_cut_percent: number;
}

export interface AdminMasterEarnings {
  total_earned: number;
  transaction_count: number;
  recent: EarningEntry[];
}

export interface AdminMasterDetail {
  account_id: string;
  display_name: string;
  bio: string | null;
  is_public: boolean;
  rate: AdminMasterRate | null;
  earnings: AdminMasterEarnings;
  follower_count: number;
  trades: Deal[];
  /** false when this master's MT5 terminal isn't live — `trades` is then []. */
  agent_running: boolean;
}

export interface AdminMasterVisibility {
  account_id: string;
  is_public: boolean;
}

export const getAdminMasters = () =>
  authedFetch<AdminMasterListItem[]>("/admin/masters", {
    method: "GET",
    timeoutMs: 20_000,
  });

export const getAdminMasterDetail = (accountId: string) =>
  authedFetch<AdminMasterDetail>(`/admin/masters/${accountId}`, {
    method: "GET",
    timeoutMs: 30_000,
  });

export const getAdminMaster = (accountId: string) => getAdminMasterDetail(accountId);

export const setAdminMasterPublic = (accountId: string, is_public: boolean) =>
  authedFetch<AdminMasterVisibility>(`/admin/masters/${accountId}/public`, {
    method: "POST",
    body: { is_public },
    timeoutMs: 15_000,
  });

export interface AdminPayout {
  id: string;
  master_account_id: string;
  period_start: string;
  period_end: string;
  amount: number;
  recipient_name: string;
  recipient_phone: string;
  status: "pending" | "paid" | "rejected";
  paid_at: string | null;
  rejection_reason: string | null;
  master_profiles: { display_name: string } | null;
}

export const getAdminPendingPayouts = () =>
  authedFetch<AdminPayout[]>("/admin/payouts", { method: "GET", timeoutMs: 15_000 });

export const approveAdminPayout = (id: string) =>
  authedFetch<AdminPayout>(`/admin/payouts/${id}/approve`, {
    method: "POST",
    timeoutMs: 15_000,
  });

export const rejectAdminPayout = (id: string, reason: string) =>
  authedFetch<AdminPayout>(`/admin/payouts/${id}/reject`, {
    method: "POST",
    body: { reason },
    timeoutMs: 15_000,
  });

export const getMasterPayouts = (accountId: string) =>
  authedFetch<AdminPayout[]>(`/masters/${accountId}/payouts`, {
    method: "GET",
    timeoutMs: 15_000,
  });

export const requestMasterPayout = (
  accountId: string,
  amount: number,
  recipient_name: string,
  recipient_phone: string,
) =>
  authedFetch<AdminPayout>(`/masters/${accountId}/payouts`, {
    method: "POST",
    body: { amount, recipient_name, recipient_phone },
    timeoutMs: 15_000,
  });