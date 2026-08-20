import { initStripe, StripeProvider, useStripe } from "@stripe/stripe-react-native";
import { ApiService } from "./api";
import { stripeEndpoints } from "./endpoints";
import { resolveStripePublishableKey } from "./remoteConfigService";

export interface PaymentSheetParams {
  paymentIntent: string; // Payment Intent client secret
  customerSessionClientSecret?: string; // Customer Session client secret (newer approach)
  ephemeralKey?: string; // Ephemeral key secret (older approach, for backward compatibility)
  customer: string; // Customer ID
  setupIntent?: string; // Setup Intent client secret (for subscriptions)
  subscriptionId?: number; // Subscription ID
  /** Business Stripe account holding this PaymentIntent. Null/absent for platform payments. */
  connectedAccountId?: string | null;
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

/**
 * Direct charges live inside the business's Stripe account, so the SDK has to be pointed
 * there before the payment sheet can find the PaymentIntent. Pass null to go back to the
 * platform account.
 */
export const useStripeAccount = async (connectedAccountId?: string | null) => {
  const publishableKey = await resolveStripePublishableKey();
  await initStripe({
    publishableKey,
    ...(connectedAccountId ? { stripeAccountId: connectedAccountId } : {}),
  });
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
  };
}

export const fetchAppointmentPaymentSheetParams = async (
  appointmentId: number,
): Promise<PaymentSheetParams> => {
  try {
    const response = await ApiService.post<AppointmentPaymentSheetApiResponse>(
      stripeEndpoints.paymentSheet,
      {
        appointment_id: appointmentId,
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
