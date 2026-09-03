import { ApiService } from "./api";
import { appointmentsEndpoints } from "./endpoints";

export type TipRecipient = {
  type: "staff" | "business";
  staffId: number | null;
  name: string;
  image?: string | null;
};

export type TipSource = "booking" | "after_service";

export type PaidTip = {
  id: number;
  amount: number;
  currency: string;
  status?: string;
  source?: TipSource;
  recipientType: "staff" | "business";
  recipientStaffId: number | null;
  recipientName: string;
  paidAt?: string;
};

export type PendingTip = {
  id: number;
  amount: number;
  currency: string;
  source: TipSource;
  recipientType: "staff" | "business";
  recipientStaffId: number | null;
  recipientName: string;
};

export type TipDetails = {
  appointmentId: number;
  canTip: boolean;
  reason: string | null;
  recipient: TipRecipient;
  currency: string;
  minAmount: number;
  maxAmount: number;
  suggestedAmounts: number[];
  tip: PaidTip | null;
  pendingTip?: PendingTip | null;
};

export type TipPaymentSheetData = {
  customer: string;
  paymentIntent: string;
  customerSessionClientSecret?: string;
  connectedAccountId: string;
  tipId: number;
  appointmentId: number;
  amount: number;
  currency: string;
  recipient: TipRecipient;
};

type TipDetailsApiResponse = {
  success: boolean;
  message: string;
  data: TipDetails;
};

type TipPaymentSheetApiResponse = {
  success: boolean;
  message: string;
  data: TipPaymentSheetData;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function capitalizeWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatTipRecipientName(name?: string | null): string {
  if (!name?.trim()) return "";
  return capitalizeWords(name.trim());
}

/** Resolve relative API image paths with EXPO_PUBLIC_API_BASE_URL. */
export function resolveApiImageUrl(image?: string | null): string | null {
  if (!image?.trim()) return null;

  const trimmed = image.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const baseUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) return trimmed;

  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${path}`;
}

export function formatTipAmount(amount: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

export function getTipHeaderTitle(recipient: TipRecipient): string {
  const name = capitalizeWords(recipient.name);
  if (recipient.type === "business") {
    return `Tip the team at ${name}`;
  }
  return `Tip ${name}`;
}

export function getTipPromptLabel(recipient: TipRecipient): string {
  const name = capitalizeWords(recipient.name);
  if (recipient.type === "business") {
    return `Say thanks to the team at ${name} with a tip.`;
  }
  return `Happy with your visit? Say thanks to ${name} with a tip.`;
}

export async function fetchTipDetails(
  appointmentId: number,
): Promise<TipDetails> {
  const response = await ApiService.get<TipDetailsApiResponse>(
    appointmentsEndpoints.tipDetails(appointmentId),
  );

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || "Failed to fetch tip details");
}

export async function createTipPaymentSheet(
  appointmentId: number,
  amount: number,
): Promise<TipPaymentSheetData> {
  const response = await ApiService.post<TipPaymentSheetApiResponse>(
    appointmentsEndpoints.tipPaymentSheet(appointmentId),
    { amount },
  );

  if (response.success && response.data) {
    return response.data;
  }

  const error = new Error(
    response.message || "Failed to create tip payment sheet",
  ) as Error & { data?: { message?: string } };
  error.data = { message: response.message };
  throw error;
}

export async function confirmTipPaid(
  appointmentId: number,
): Promise<PaidTip | null> {
  const attempts = [0, 1500, 3000];

  for (const delayMs of attempts) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    const details = await fetchTipDetails(appointmentId);
    if (details.tip?.status === "paid" || (details.tip && !details.canTip)) {
      return details.tip;
    }
  }

  return null;
}
