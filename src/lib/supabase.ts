import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  "https://txdcattalsgunfolplvs.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4ZGNhdHRhbHNndW5mb2xwbHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzAzOTcsImV4cCI6MjA5OTk0NjM5N30.QImPwkBrib0YPA8gkramnaTVe9b4BvzDloCqfpdq_EA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const getActiveAccountsQuery = (select = "*") =>
  supabase.from("accounts").select(select).neq("status", "closed");

export type AccountRole = "master" | "follower";
export type AccountStatus = "live" | "offline" | "paused" | "pending" | string;
export type AccountPlatform = "mt5" | "ctrader";
export type SizingMode =
  "fixed_multiplier" | "balance_proportional" | "fixed_master_balance_percentage";

export interface AccountRow {
  account_id: string;
  role: AccountRole;
  status: AccountStatus;
  user_id?: string;
  created_at?: string;
  // Absent on rows created before this column existed - treat missing as
  // "mt5" everywhere, matching the DB column's own default (see
  // copydesk_fanout/migrations/001_ctrader_support.sql).
  platform?: AccountPlatform;
}

export interface SubscriptionRow {
  id?: string;
  master_account_id: string;
  follower_account_id: string;
  multiplier: number;
  sizing_mode: SizingMode;
  active: boolean;
}

export interface LiveAccountState {
  account_id: string;
  balance: number | null;
  equity: number | null;
  open_positions: number | null;
  updated_at?: string;
}