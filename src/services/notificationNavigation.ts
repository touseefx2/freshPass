import type { Router } from "expo-router";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

export type NotificationSubType =
  | "appointment_scheduled"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "appointment_cancelled_refunded"
  | "appointment_reminder"
  | "appointment_completed"
  | "payment_request"
  | "review_request"
  | "tip_request"
  | "subscription_usage";

export type NotificationNavigationData = {
  type?: string | null;
  model_id?: number | null;
  subType?: string | null;
  sub_type?: string | null;
  job_id?: string | null;
  sender?: {
    id: number;
    name?: string;
    profile_image_url?: string | null;
  } | null;
} & Record<string, unknown>;

function getNotificationSubType(
  data: NotificationNavigationData,
): NotificationSubType | null {
  const raw = data.subType ?? data.sub_type ?? null;
  if (typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  return raw as NotificationSubType;
}

/**
 * Navigate based on notification data (push payload or API notification item).
 * Used by ExpoNotificationHandler (push tap), Notifications screen (list item tap),
 * and pendingNotificationNavigation (cold start after splash).
 * - type "message" + model_id + sender → chatBox
 * - type "appointment" + model_id → bookingDetailsById
 * - type "ai_memory" → Profile → AI Tools → Memories (panel: back first, then chain)
 * - type "airequest" + job_id → aiRequests, then aiResults for that job
 * - type "manageSubscriptionList" → Profile → Business profile settings → Manage subscriptions
 * - type "subscription" (customer role) → Profile → Customer subscriptions
 * - type "business" | "service" + model_id (customer role) → businessDetail
 * - otherwise → notification screen (unless options.skipNotificationScreen is true, e.g. when already on that screen)
 */
const AI_MEMORY_CHAIN_STEP_MS = 15;
const AI_MEMORY_BACK_DELAY_MS = 50;

function navigateToAiMemoriesViaProfileAndTools(router: Router): void {
  router.push("/(main)/dashboard/(account)");
  setTimeout(() => {
    router.push("/(main)/aiTools/toolList");
    setTimeout(() => {
      router.push("/(main)/aiMemories");
    }, AI_MEMORY_CHAIN_STEP_MS);
  }, AI_MEMORY_CHAIN_STEP_MS);
}

export function navigateFromNotificationData(
  router: Router,
  data: NotificationNavigationData | undefined,
  options?: { skipNotificationScreen?: boolean; fromInAppList?: boolean },
): void {
  if (!data || !data?.type) return;
  Logger.log("------>navigateFromNotificationData", data);

  const type = data.type as string | undefined;
  if (type === "message") {
    const modelId = data.model_id as number | undefined;
    const sender = data.sender as
      | { id: number; name?: string; profile_image_url?: string | null }
      | undefined;
    if (modelId != null && sender != null) {
      const chatItem = {
        id: String(modelId),
        name: sender.name ?? "-----",
        image: sender.profile_image_url ?? "",
      };
      router.push({
        pathname: "/(main)/chatBox",
        params: { id: String(modelId), chatItem: JSON.stringify(chatItem) },
      });
      Logger.log("------>navigateFromNotificationData (message) -> chatBox", {
        id: modelId,
        chatItem,
      });
      return;
    }
  }

  if (type === "appointment") {
    const modelId = data.model_id as number | undefined;
    if (modelId != null) {
      const subType = getNotificationSubType(data);

      switch (subType) {
        case "review_request":
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: { bookingId: String(modelId), openReview: "1" },
          });
          Logger.log(
            "------>navigateFromNotificationData (review_request) -> bookingDetailsById",
            { bookingId: modelId },
          );
          return;

        case "tip_request":
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: { bookingId: String(modelId) },
          });
          Logger.log(
            "------>navigateFromNotificationData (tip_request) -> bookingDetailsById",
            { bookingId: modelId },
          );
          return;

        case "payment_request":
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: { bookingId: String(modelId), openPay: "1" },
          });
          Logger.log(
            "------>navigateFromNotificationData (payment_request) -> bookingDetailsById",
            { bookingId: modelId },
          );
          return;

        default:
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: { bookingId: String(modelId) },
          });
          Logger.log(
            "------>navigateFromNotificationData (appointment) -> bookingDetailsById",
            { bookingId: modelId, subType },
          );
          return;
      }
    }
  }

  if (type === "ai_memory") {
    if (options?.fromInAppList) {
      if (router.canGoBack()) {
        router.back();
      }
      setTimeout(() => {
        navigateToAiMemoriesViaProfileAndTools(router);
      }, AI_MEMORY_BACK_DELAY_MS);
    } else {
      navigateToAiMemoriesViaProfileAndTools(router);
    }
    Logger.log(
      "------>navigateFromNotificationData (ai_memory) -> account -> toolList -> aiMemories",
      { fromInAppList: options?.fromInAppList ?? false },
    );
    return;
  }

  if (type === "airequest") {
    const jobId = data.job_id as string | undefined;
    if (jobId) {
       
        router.push({
          pathname: "/aiResults",
          params: { jobId, fromNotification: "1" },
        });
     
      Logger.log(
        "------>navigateFromNotificationData (airequest) -> aiRequests -> aiResults",
        { jobId },
      );
      return;
    }
  }

  if (type === "business" || type === "service") {
    const modelId = data.model_id as number | undefined;
    const userRole = store.getState().user.userRole;
    if (userRole === "customer" && modelId != null) {
      router.push({
        pathname: "/(main)/businessDetail",
        params: { business_id: String(modelId) },
      });
      Logger.log(
        `------>navigateFromNotificationData (${type}) -> businessDetail`,
        { business_id: modelId },
      );
      return;
    }
  }

  if (type === "manageSubscriptionList") {
    router.push("/(main)/dashboard/(account)");
    setTimeout(() => {
      router.push("/(main)/dashboard/(account)/(businessProfileSettings)");
      setTimeout(() => {
        router.push(
          "/(main)/dashboard/(account)/(businessProfileSettings)/subscriptions",
        );
      }, 15);
    }, 15);
    Logger.log(
      "------>navigateFromNotificationData (manageSubscriptionList) -> subscriptions",
    );
    return;
  }

  if (type === "subscription") {
    const userRole = store.getState().user.userRole;
    if (userRole === "customer") {
      const navigateToCustomerSubscriptions = () => {
        router.push("/(main)/dashboard/(account)");
        setTimeout(() => {
          router.push("/(main)/dashboard/(account)/subscriptionCustomer");
        }, AI_MEMORY_CHAIN_STEP_MS);
      };

      if (options?.fromInAppList) {
        if (router.canGoBack()) {
          router.back();
        }
        setTimeout(() => {
          navigateToCustomerSubscriptions();
        }, AI_MEMORY_BACK_DELAY_MS);
      } else {
        navigateToCustomerSubscriptions();
      }

      Logger.log(
        "------>navigateFromNotificationData (subscription) -> account -> subscriptionCustomer",
        {
          model_id: data.model_id,
          event: data.event,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }
  }

  if (!options?.skipNotificationScreen) {
    router.push("/(main)/notification" as any);
  }
}
