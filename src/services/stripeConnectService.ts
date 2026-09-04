import { ApiService } from "./api";
import { stripeEndpoints } from "./endpoints";
import { getStripeModeHeaders } from "./stripeService";

export class StripeConnectApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "StripeConnectApiError";
    this.status = status;
  }
}

export type StripeOnboardingStatus = "pending" | "completed" | string;

export interface AccountSessionData {
  client_secret: string;
  stripe_account_id?: string;
  expires_at?: number;
  stripe_onboarding_status?: StripeOnboardingStatus;
}

export interface ConnectStatusData {
  stripe_onboarding_status: StripeOnboardingStatus;
  stripe_account_id?: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
}

interface AccountSessionApiResponse {
  success: boolean;
  message: string;
  data: AccountSessionData;
}

interface ConnectStatusApiResponse {
  success: boolean;
  message: string;
  data: ConnectStatusData;
}

let lastAccountSessionError: StripeConnectApiError | null = null;

export function getLastAccountSessionError(): StripeConnectApiError | null {
  return lastAccountSessionError;
}

function toConnectError(error: unknown): StripeConnectApiError {
  const err = error as { message?: string; status?: number };
  return new StripeConnectApiError(
    err?.message || "Failed to reach Stripe Connect",
    err?.status,
  );
}

export function isConnectOnboardingCompleted(
  status?: ConnectStatusData | null,
): boolean {
  return status?.stripe_onboarding_status === "completed";
}

/** Never cache — the SDK calls this again when the session expires. */
export async function createAccountSessionClientSecret(): Promise<string> {
  try {
    lastAccountSessionError = null;
    const response = await ApiService.post<AccountSessionApiResponse>(
      stripeEndpoints.connectAccountSession,
      {},
      { headers: await getStripeModeHeaders() },
    );

    const clientSecret = response?.data?.client_secret?.trim();
    if (response.success && clientSecret) {
      return clientSecret;
    }

    throw new StripeConnectApiError(
      response?.message || "Failed to create account session",
    );
  } catch (error) {
    const mapped = toConnectError(error);
    lastAccountSessionError = mapped;
    throw mapped;
  }
}

export async function fetchConnectStatus(): Promise<ConnectStatusData> {
  try {
    const response = await ApiService.get<ConnectStatusApiResponse>(
      stripeEndpoints.connectStatus,
      { headers: await getStripeModeHeaders() },
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new StripeConnectApiError(
      response?.message || "Failed to fetch Stripe onboarding status",
    );
  } catch (error) {
    throw toConnectError(error);
  }
}
