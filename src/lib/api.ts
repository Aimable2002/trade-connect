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

export async function provisionAccount(
  input: ProvisionInput,
): Promise<ProvisionResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new ProvisionError("You must be signed in.", 401);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/accounts/provision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeout);
    if ((e as Error).name === "AbortError") {
      throw new ProvisionError(
        "Provisioning timed out after 90s. The terminal may still be spinning up — refresh in a minute.",
      );
    }
    throw new ProvisionError(
      `Could not reach provisioning server: ${(e as Error).message}`,
    );
  }
  clearTimeout(timeout);

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // non-json response
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

  return body as ProvisionResponse;
}
