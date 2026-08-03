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