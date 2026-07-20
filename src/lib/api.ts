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
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ProvisionError";
  }
}

// Alias so callers can use a semantically-correct name for non-provision routes.
export const ApiError = ProvisionError;
export type ApiError = ProvisionError;

interface RequestOpts {
  method?: "GET" | "POST";
  body?: unknown;
  timeoutMs?: number;
}

async function authedFetch<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ProvisionError("You must be signed in.", 401);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 30_000,
  );

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
        "Request timed out. The MT5 terminal may still be responding — try again in a moment.",
      );
    }
    throw new ProvisionError(
      `Could not reach server: ${(e as Error).message}`,
    );
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

export async function provisionAccount(
  input: ProvisionInput,
): Promise<ProvisionResponse> {
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

export interface MasterProfileInput {
  display_name: string;
  bio?: string;
  is_public: boolean;
}

export interface MasterProfile {
  account_id: string;
  display_name: string;
  bio?: string;
  is_public: boolean;
}

export const upsertMasterProfile = (
  accountId: string,
  input: MasterProfileInput,
) =>
  authedFetch<MasterProfile>(`/masters/${accountId}/profile`, {
    method: "POST",
    body: input,
    timeoutMs: 15_000,
  });

export interface DirectoryMaster {
  account_id: string;
  display_name: string;
  bio?: string;
}

export const getMastersDirectory = () =>
  authedFetch<DirectoryMaster[]>("/masters/directory", {
    method: "GET",
    timeoutMs: 15_000,
  });

// -------- Trades --------

export interface Deal {
  deal_ticket: string;
  magic: number;
  symbol: string;
  lots: number;
  type: string; // "buy" | "sell"
  entry: string; // "in" | "out" | ...
  deal_time: string; // "2026.07.19 03:52:57"
  deal_price: number;
  pnl: number;
  commission: number;
  swap: number;
  comment: string;
}

// ~10s live call to MT5
export const getAccountTrades = (accountId: string) =>
  authedFetch<Deal[]>(`/accounts/${accountId}/trades`, {
    method: "GET",
    timeoutMs: 20_000,
  });

// Same shape, but public for masters with is_public=true
export const getMasterTrades = (accountId: string) =>
  authedFetch<Deal[]>(`/masters/${accountId}/trades`, {
    method: "GET",
    timeoutMs: 20_000,
  });
