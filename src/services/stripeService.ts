import {
  initStripe,
  StripeProvider,
  useStripe,
} from "@stripe/stripe-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiService } from "./api";
import { stripeEndpoints } from "./endpoints";
import Logger from "./logger";

const STRIPE_KEY_CACHE = "@freshpass/stripe_publishable_key";

export type PaymentSheetTipInfo = {
  id: number;
  amount: number;
  recipientType: "staff" | "business";
  recipientStaffId: number | null;
  recipientName: string;
};

export interface PaymentSheetParams {
  paymentIntent: string; // Payment Intent client secret
  customerSessionClientSecret?: string; // Customer Session client secret (newer approach)
  ephemeralKey?: string; // Ephemeral key secret (older approach, for backward compatibility)
  customer: string; // Customer ID
  setupIntent?: string; // Setup Intent client secret (for subscriptions)
  subscriptionId?: number; // Subscription ID
  /** Business Stripe account holding this PaymentIntent. Null/absent for platform payments. */
  connectedAccountId?: string | null;
  serviceAmount?: number;
  tipAmount?: number;
  totalAmount?: number;
  currency?: string;
  tip?: PaymentSheetTipInfo | null;
}

interface PaymentSheetApiResponse {
  success: boolean;
  message: string;
  data: {
    customer: string;
    customerSessionClientSecret?: string; // Newer approach - Customer Session
    ephemeralKey?: string; // Older approach - Ephemeral Key (for backward compatibility)
    setupIntent?: string;
    paymentIntent: string; // Payment Intent client secret
    subscriptionPlanId: number; // Note: API returns subscriptionPlanId (camelCase)
    connectedAccountId?: string | null;
  };
}

interface StripeConfigApiResponse {
  success: boolean;
  message: string;
  data: {
    mode?: string;
    publishable_key?: string;
  };
}

function describeKey(key: string, source: string) {
  return {
    source,
    mode: key.startsWith("pk_live_")
      ? "live"
      : key.startsWith("pk_test_")
        ? "test"
        : "unknown",
    length: key.length,
    // Publishable keys are client-safe; only log full value in dev
    ...(__DEV__ ? { key } : {}),
  };
}

/**
 * Resolves Stripe publishable key from GET /api/config/stripe,
 * with AsyncStorage cache for offline / failed network.
 *
 * Always tries the API first so payment screens can retry after a failed startup fetch.
 */
export async function resolveStripePublishableKey(): Promise<string> {
  try {
    const cached = (await AsyncStorage.getItem(STRIPE_KEY_CACHE))?.trim();
    Logger.log("[Stripe] Fetching publishable key from API...");

    const response = await ApiService.get<StripeConfigApiResponse>(
      stripeEndpoints.config,
    );
    const fromApi = response?.data?.publishable_key?.trim();

    if (fromApi) {
      if (fromApi !== cached) {
        await AsyncStorage.setItem(STRIPE_KEY_CACHE, fromApi);
      }
      Logger.log(
        "[Stripe] ✅ Using key from API",
        describeKey(fromApi, "api"),
      );
      return fromApi;
    }

    if (cached) {
      Logger.log(
        "[Stripe] ⚠️ API empty — using cached key",
        describeKey(cached, "cache"),
      );
      return cached;
    }
  } catch (error) {
    Logger.warn("[Stripe] API key fetch failed:", error);
    try {
      const cached = (await AsyncStorage.getItem(STRIPE_KEY_CACHE))?.trim();
      if (cached) {
        Logger.log(
          "[Stripe] ⚠️ Fetch failed — using cached key",
          describeKey(cached, "cache_after_error"),
        );
        return cached;
      }
    } catch {
      // ignore cache read errors
    }
  }

  Logger.warn("[Stripe] ❌ No publishable key from API or cache");
  return "";
}

/**
 * Direct charges live inside the business's Stripe account, so the SDK has to be pointed
 * there before the payment sheet can find the PaymentIntent. Pass null to go back to the
 * platform account.
 *
 * Also re-fetches the publishable key (API → cache) so payments still work if startup
 * fetch failed due to network.
 */
export const useStripeAccount = async (connectedAccountId?: string | null) => {
  const publishableKey = await resolveStripePublishableKey();
  if (!publishableKey) {
    throw new Error(
      "Stripe is not configured. Please check your connection and try again.",
    );
  }
  await initStripe({
    publishableKey,
    ...(connectedAccountId ? { stripeAccountId: connectedAccountId } : {}),
  });
  return publishableKey;
};

/**
 * Ensures Stripe SDK has a publishable key before presenting PaymentSheet
 * (platform charges — no connected account). Retries API if startup fetch failed.
 */
export const ensureStripeReady = async (): Promise<string> => {
  return useStripeAccount(null);
};

export const fetchPaymentSheetParams = async (
  planId: number,
  additionalServiceIds: number[] = [],
): Promise<PaymentSheetParams> => {
  try {
    const response = await ApiService.post<PaymentSheetApiResponse>(
      stripeEndpoints.paymentSheet,
      {
        subscription_plan_id: planId,
        additional_service_ids: additionalServiceIds,
      },
    );

    // Extract data from nested response structure
    if (response.success && response.data) {
      return {
        customer: response.data.customer,
        customerSessionClientSecret: response.data.customerSessionClientSecret,
        ephemeralKey: response.data.ephemeralKey,
        paymentIntent: response.data.paymentIntent || "",
        setupIntent: response.data.setupIntent,
        subscriptionId: response.data.subscriptionPlanId, // Map subscriptionPlanId to subscriptionId
        connectedAccountId: response.data.connectedAccountId ?? null,
      };
    }

    throw new Error(
      response.message || "Failed to fetch payment sheet parameters",
    );
  } catch (error) {
    throw error;
  }
};

interface AppointmentPaymentSheetApiResponse {
  success: boolean;
  message: string;
  data: {
    customer: string;
    customerSessionClientSecret?: string;
    ephemeralKey?: string;
    paymentIntent: string;
    setupIntent: string;
    connectedAccountId?: string | null;
    serviceAmount?: number;
    tipAmount?: number;
    totalAmount?: number;
    currency?: string;
    tip?: PaymentSheetTipInfo | null;
  };
}

export const fetchAppointmentPaymentSheetParams = async (
  appointmentId: number,
): Promise<PaymentSheetParams> => {
  try {
    const body: { appointment_id: number } = {
      appointment_id: appointmentId,
    };

    const response = await ApiService.post<AppointmentPaymentSheetApiResponse>(
      stripeEndpoints.paymentSheet,
      body,
    );

    // Extract data from nested response structure
    if (response.success && response.data) {
      return {
        customer: response.data.customer,
        customerSessionClientSecret: response.data.customerSessionClientSecret,
        ephemeralKey: response.data.ephemeralKey,
        paymentIntent: response.data.paymentIntent || "",
        setupIntent: response.data.setupIntent,
        connectedAccountId: response.data.connectedAccountId ?? null,
        serviceAmount: response.data.serviceAmount,
        tipAmount: response.data.tipAmount,
        totalAmount: response.data.totalAmount,
        currency: response.data.currency,
        tip: response.data.tip ?? null,
      };
    }

    throw new Error(
      response.message || "Failed to fetch payment sheet parameters",
    );
  } catch (error) {
    throw error;
  }
};

interface AiToolsPaymentSheetApiResponse {
  success: boolean;
  message: string;
  data: {
    customer: string;
    paymentIntent: string;
    customerSessionClientSecret?: string;
    serviceId: number;
  };
}

export const fetchAiToolsPaymentSheetParams = async (
  serviceId: number,
): Promise<PaymentSheetParams> => {
  try {
    const response = await ApiService.post<AiToolsPaymentSheetApiResponse>(
      stripeEndpoints.paymentSheetAiTools,
      { service_id: serviceId },
    );

    if (response.success && response.data) {
      return {
        customer: response.data.customer,
        paymentIntent: response.data.paymentIntent || "",
        customerSessionClientSecret: response.data.customerSessionClientSecret,
      };
    }

    throw new Error(
      response.message || "Failed to fetch payment sheet parameters",
    );
  } catch (error) {
    throw error;
  }
};

export { StripeProvider, useStripe };
