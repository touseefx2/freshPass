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
  | "appointment_outcome_needed"
  | "appointment_outcome_summary"
  | "appointment_no_show"
  | "appointment_outcome_corrected"
  | "appointment_fee_charge_failed"
  | "appointment_cancelled_fee_charged"
  | "appointment_cancelled_visit_forfeited"
  | "membership_visit_restored"
  | "payment_request"
  | "review_request"
  | "tip_request"
  | "subscription_usage"
  | "affiliation_request"
  | "affiliation_request_sent"
  | "affiliation_approved"
  | "affiliation_rejected"
  | "affiliation_request_cancelled"
  | "affiliation_removed"
  | "plan_upgraded"
  | "solo_switch"
  | "business_availability_sync"
  | "customer_subscription_purchased"
  | "follow_new_reel"
  | "follow_new_service"
  | "follow_new_membership"
  | "business_new_follower"
  | "business_reel_comment"
  | "business_reel_booking"
  | "business_reel_likes"
  | "appointment_checkout_failed";

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

/** Coerce notification payload ids that may arrive as number or numeric string. */
function pickNumber(
  data: NotificationNavigationData,
  ...keys: string[]
): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function openReelPlayer(
  router: Router,
  reelId: number,
  options?: { openComments?: boolean; fromInAppList?: boolean },
): void {
  const path = {
    pathname: "/(main)/reelsFeed" as const,
    params: {
      first_reel_id: String(reelId),
      ...(options?.openComments ? { open_comments: "1" } : {}),
    },
  };
  if (options?.fromInAppList) {
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      router.push(path as any);
    }, AI_MEMORY_BACK_DELAY_MS);
    return;
  }
  router.push(path as any);
}

function openBusinessProfile(
  router: Router,
  businessId: number,
  options?: { fromInAppList?: boolean; scrollTo?: string },
): void {
  const path = {
    pathname: "/(main)/businessDetail" as const,
    params: {
      business_id: String(businessId),
      ...(options?.scrollTo ? { scroll_to: options.scrollTo } : {}),
    },
  };
  if (options?.fromInAppList) {
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      router.push(path as any);
    }, AI_MEMORY_BACK_DELAY_MS);
    return;
  }
  router.push(path as any);
}

function openOwnerReelsList(
  router: Router,
  options?: { fromInAppList?: boolean },
): void {
  navigateViaProfileFromNotification(
    router,
    "/(main)/aiTools/toolList",
    options?.fromInAppList,
  );
}

/**
 * Navigate based on notification data (push payload or API notification item).
 * Used by ExpoNotificationHandler (push tap), Notifications screen (list item tap),
 * and pendingNotificationNavigation (cold start after splash).
 * - type "message" + model_id + sender → chatBox
 * - type "appointment" + model_id → bookingDetailsById
 * - type "appointment_outcomes" + model_id → bookingDetailsById (else home)
 * - type "appointment_checkout" + subType appointment_checkout_failed → bookingNow (if business_id) or notification list — never appointment details
 * - type "ai_memory" → Profile → AI Tools → Memories (panel: back first, then chain)
 * - type "airequest" + job_id → aiRequests, then aiResults for that job
 * - type "manageSubscriptionList" → no navigation (Stripe Connect Setup Complete; informational only)
 * - type "customer_subscription" + model_id (business role) → Profile → Customers → businessCustomerDetail
 * - type "subscription" (customer role) → Profile → Customer subscriptions
 * - type "subscription" (business role) → Profile → Subscription
 * - type "availability" (staff) → Profile → Staff availability
 * - type "availability" (business) → Profile → Business setup availability
 * - type "affiliation" (host) → Profile → Affiliation requests
 * - type "affiliation" (solo) → Profile → Edit profile
 * - type "business" | "service" + model_id (customer role) → businessDetail
 * - type "follow" + sub_type follow_new_reel → reelsFeed; else → businessDetail
 * - type "business_follower" → owner's businessDetail
 * - type "business_reel" + comment → reelsFeed+comments; booking → appointment; likes → reelStats
 * - otherwise → notification screen (unless options.skipNotificationScreen is true, e.g. when already on that screen)
 */
const AI_MEMORY_CHAIN_STEP_MS = 15;
const AI_MEMORY_BACK_DELAY_MS = 50;

const AFFILIATION_REQUESTS_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/affiliationRequests";
const EDIT_PROFILE_PATH =
  "/(main)/dashboard/(account)/(profile)/editProfile";
const STAFF_AVAILABILITY_PATH =
  "/(main)/dashboard/(account)/staffAvailability";
const BUSINESS_AVAILABILITY_PATH =
  "/(main)/dashboard/(account)/(businessProfileSettings)/setupAvailability";
const CUSTOMERS_PATH = "/(main)/dashboard/(account)/customers";

function navigateToAiMemoriesViaProfileAndTools(router: Router): void {
  router.push("/(main)/dashboard/(account)");
  setTimeout(() => {
    router.push({
      pathname: "/(main)/aiTools/toolList",
      params: { mode: "aiTools" },
    });
    setTimeout(() => {
      router.push("/(main)/aiMemories");
    }, AI_MEMORY_CHAIN_STEP_MS);
  }, AI_MEMORY_CHAIN_STEP_MS);
}

/** Profile → Customers → Customer detail (back stack matches in-app path). */
function navigateToCustomerDetailViaProfileAndCustomers(
  router: Router,
  customerId: number,
): void {
  router.push("/(main)/dashboard/(account)");
  setTimeout(() => {
    router.push(CUSTOMERS_PATH as any);
    setTimeout(() => {
      router.push({
        pathname: "/(main)/businessCustomerDetail",
        params: { id: String(customerId) },
      } as any);
    }, AI_MEMORY_CHAIN_STEP_MS);
  }, AI_MEMORY_CHAIN_STEP_MS);
}

/** Profile tab first, then nested destination (back stack matches in-app path). */
function navigateViaProfile(router: Router, path: string): void {
  router.push("/(main)/dashboard/(account)");
  setTimeout(() => {
    router.push(path as any);
  }, AI_MEMORY_CHAIN_STEP_MS);
}

function navigateViaProfileFromNotification(
  router: Router,
  path: string,
  fromInAppList?: boolean,
): void {
  if (fromInAppList) {
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      navigateViaProfile(router, path);
    }, AI_MEMORY_BACK_DELAY_MS);
    return;
  }
  navigateViaProfile(router, path);
}

function navigateFromNotificationList(
  router: Router,
  path: string,
  fromInAppList?: boolean,
): void {
  if (fromInAppList) {
    if (router.canGoBack()) {
      router.back();
    }
    setTimeout(() => {
      router.push(path as any);
    }, AI_MEMORY_BACK_DELAY_MS);
    return;
  }
  router.push(path as any);
}

export function navigateFromNotificationData(
  router: Router,
  data: NotificationNavigationData | undefined,
  options?: { skipNotificationScreen?: boolean; fromInAppList?: boolean },
): void {
  if (!data || !data?.type) return;
  Logger.log("------>navigateFromNotificationData", data);

  const type = data.type as string | undefined;
  const subType = getNotificationSubType(data);

  if (type === "update_location") {
    navigateFromNotificationList(
      router,
      "/(main)/dashboard/(account)/(businessProfileSettings)/location",
      options?.fromInAppList,
    );
    return;
  }

  if (type === "affiliation") {
    const hostSubTypes: NotificationSubType[] = [
      "affiliation_request",
      "affiliation_request_cancelled",
    ];
    const soloSubTypes: NotificationSubType[] = [
      "affiliation_request_sent",
      "affiliation_approved",
      "affiliation_rejected",
    ];
    const currentUser = store.getState().user;
    const notificationSoloUserId =
      typeof data.solo_user_id === "number" ? data.solo_user_id : null;
    const isSolo =
      notificationSoloUserId === currentUser.id ||
      currentUser.businessStatus?.subscription_is_single === true;

    const goToAffiliationRequests =
      hostSubTypes.includes(subType as NotificationSubType) ||
      (subType === "affiliation_removed" && !isSolo);

    if (goToAffiliationRequests) {
      navigateViaProfileFromNotification(
        router,
        AFFILIATION_REQUESTS_PATH,
        options?.fromInAppList,
      );
      Logger.log(
        "------>navigateFromNotificationData (affiliation) -> account -> affiliationRequests",
        {
          subType,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }

    const goToEditProfile =
      soloSubTypes.includes(subType as NotificationSubType) ||
      subType === "affiliation_removed";

    if (goToEditProfile) {
      navigateViaProfileFromNotification(
        router,
        EDIT_PROFILE_PATH,
        options?.fromInAppList,
      );
      Logger.log(
        "------>navigateFromNotificationData (affiliation) -> account -> editProfile",
        {
          subType,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }

    navigateFromNotificationList(
      router,
      "/(main)/notification",
      options?.fromInAppList,
    );
    return;
  }

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

  if (type === "appointment_outcomes") {
    const modelId = data.model_id as number | undefined;
    if (modelId != null) {
      router.push({
        pathname: "/(main)/bookingDetailsById",
        params: { bookingId: String(modelId) },
      });
      Logger.log(
        "------>navigateFromNotificationData (appointment_outcomes) -> bookingDetailsById",
        { bookingId: modelId, subType, count: data.count },
      );
      return;
    }
    router.push("/(main)/dashboard/(home)");
    Logger.log(
      "------>navigateFromNotificationData (appointment_outcomes) -> home",
      { count: data.count },
    );
    return;
  }

  // Pay-now checkout failed after payment — no appointment exists. Do NOT open
  // appointment details. Prefer business booking screen when business_id is present.
  if (type === "appointment_checkout") {
    if (subType === "appointment_checkout_failed") {
      const businessId = pickNumber(data, "business_id");
      if (businessId != null) {
        router.push({
          pathname: "/(main)/bookingNow",
          params: { business_id: String(businessId) },
        });
        Logger.log(
          "------>navigateFromNotificationData (appointment_checkout_failed) -> bookingNow",
          { business_id: businessId, checkoutId: data.model_id },
        );
        return;
      }
      navigateFromNotificationList(
        router,
        "/(main)/notification",
        options?.fromInAppList,
      );
      Logger.log(
        "------>navigateFromNotificationData (appointment_checkout_failed) -> notification list",
        { checkoutId: data.model_id },
      );
      return;
    }

    navigateFromNotificationList(
      router,
      "/(main)/notification",
      options?.fromInAppList,
    );
    return;
  }

  if (type === "appointment") {
    const modelId = data.model_id as number | undefined;
    if (modelId != null) {
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

        case "appointment_outcome_needed":
          router.push({
            pathname: "/(main)/bookingDetailsById",
            params: {
              bookingId: String(modelId),
              openOutcome: "1",
            },
          });
          Logger.log(
            "------>navigateFromNotificationData (appointment_outcome_needed) -> bookingDetailsById",
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

  // Stripe Connect Setup Complete — informational only; do not navigate
  if (type === "manageSubscriptionList") {
    Logger.log(
      "------>navigateFromNotificationData (manageSubscriptionList) -> skipped (no navigation)",
    );
    return;
  }

  if (type === "customer_subscription") {
    const modelId = data.model_id as number | undefined;
    const userRole = store.getState().user.userRole;
    if (userRole === "business" && modelId != null) {
      if (options?.fromInAppList) {
        if (router.canGoBack()) {
          router.back();
        }
        setTimeout(() => {
          navigateToCustomerDetailViaProfileAndCustomers(router, modelId);
        }, AI_MEMORY_BACK_DELAY_MS);
      } else {
        navigateToCustomerDetailViaProfileAndCustomers(router, modelId);
      }
      Logger.log(
        "------>navigateFromNotificationData (customer_subscription) -> account -> customers -> businessCustomerDetail",
        {
          customer_id: modelId,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }
  }

  if (type === "subscription") {
    const userRole = store.getState().user.userRole;
    const subscriptionPath =
      userRole === "business"
        ? "/(main)/dashboard/(account)/subscription"
        : userRole === "customer"
          ? "/(main)/dashboard/(account)/subscriptionCustomer"
          : null;

    if (subscriptionPath) {
      const navigateToSubscriptions = () => {
        router.push("/(main)/dashboard/(account)");
        setTimeout(() => {
          router.push(subscriptionPath);
        }, AI_MEMORY_CHAIN_STEP_MS);
      };

      if (options?.fromInAppList) {
        if (router.canGoBack()) {
          router.back();
        }
        setTimeout(() => {
          navigateToSubscriptions();
        }, AI_MEMORY_BACK_DELAY_MS);
      } else {
        navigateToSubscriptions();
      }

      Logger.log(
        `------>navigateFromNotificationData (subscription) -> account -> ${
          userRole === "business" ? "subscription" : "subscriptionCustomer"
        }`,
        {
          model_id: data.model_id,
          event: data.event,
          userRole,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }
  }

  if (type === "availability") {
    const userRole = store.getState().user.userRole;
    const availabilityPath =
      userRole === "staff"
        ? STAFF_AVAILABILITY_PATH
        : userRole === "business"
          ? BUSINESS_AVAILABILITY_PATH
          : null;

    if (availabilityPath) {
      navigateViaProfileFromNotification(
        router,
        availabilityPath,
        options?.fromInAppList,
      );
      Logger.log(
        `------>navigateFromNotificationData (availability) -> account -> ${
          userRole === "staff" ? "staffAvailability" : "setupAvailability"
        }`,
        {
          subType,
          userRole,
          fromInAppList: options?.fromInAppList ?? false,
        },
      );
      return;
    }
  }

  // R-16 · Follow notifications (customer following a business)
  if (type === "follow") {
    const businessId = pickNumber(data, "business_id", "model_id");
    const reelId = pickNumber(data, "reel_id");

    if (subType === "follow_new_reel" && reelId != null) {
      openReelPlayer(router, reelId, {
        fromInAppList: options?.fromInAppList,
      });
      Logger.log(
        "------>navigateFromNotificationData (follow_new_reel) -> reelsFeed",
        { reel_id: reelId },
      );
      return;
    }

    if (subType === "follow_new_membership" && businessId != null) {
      openBusinessProfile(router, businessId, {
        fromInAppList: options?.fromInAppList,
        scrollTo: "memberships",
      });
      Logger.log(
        "------>navigateFromNotificationData (follow_new_membership) -> businessDetail memberships",
        { business_id: businessId },
      );
      return;
    }

    // follow_new_service + unknown follow subtypes → business profile
    if (businessId != null) {
      openBusinessProfile(router, businessId, {
        fromInAppList: options?.fromInAppList,
      });
      Logger.log(
        `------>navigateFromNotificationData (follow/${subType ?? "unknown"}) -> businessDetail`,
        { business_id: businessId },
      );
      return;
    }
  }

  // R-23 · New follower alert for the business owner
  if (type === "business_follower") {
    const ownBusinessId = store.getState().user.business_id;
    if (ownBusinessId != null) {
      openBusinessProfile(router, Number(ownBusinessId), {
        fromInAppList: options?.fromInAppList,
      });
      Logger.log(
        "------>navigateFromNotificationData (business_new_follower) -> own businessDetail",
        { business_id: ownBusinessId },
      );
      return;
    }
    navigateViaProfileFromNotification(
      router,
      EDIT_PROFILE_PATH,
      options?.fromInAppList,
    );
    return;
  }

  // R-23 · Owner alerts about their reels (comment / booking / likes digest)
  if (type === "business_reel") {
    if (subType === "business_reel_comment") {
      const reelId = pickNumber(data, "reel_id", "model_id");
      if (reelId != null) {
        openReelPlayer(router, reelId, {
          openComments: true,
          fromInAppList: options?.fromInAppList,
        });
        Logger.log(
          "------>navigateFromNotificationData (business_reel_comment) -> reelsFeed + comments",
          { reel_id: reelId, comment_id: data.comment_id },
        );
        return;
      }
    }

    if (subType === "business_reel_booking") {
      const appointmentId = pickNumber(data, "appointment_id");
      if (appointmentId != null) {
        const path = {
          pathname: "/(main)/bookingDetailsById" as const,
          params: { bookingId: String(appointmentId) },
        };
        if (options?.fromInAppList) {
          if (router.canGoBack()) {
            router.back();
          }
          setTimeout(() => {
            router.push(path as any);
          }, AI_MEMORY_BACK_DELAY_MS);
        } else {
          router.push(path as any);
        }
        Logger.log(
          "------>navigateFromNotificationData (business_reel_booking) -> bookingDetailsById",
          { appointment_id: appointmentId },
        );
        return;
      }
    }

    if (subType === "business_reel_likes") {
      const reelId = pickNumber(data, "top_reel_id", "model_id");
      if (reelId != null) {
        const path = {
          pathname: "/(main)/reelStats" as const,
          params: { id: String(reelId) },
        };
        if (options?.fromInAppList) {
          if (router.canGoBack()) {
            router.back();
          }
          setTimeout(() => {
            router.push(path as any);
          }, AI_MEMORY_BACK_DELAY_MS);
        } else {
          router.push(path as any);
        }
        Logger.log(
          "------>navigateFromNotificationData (business_reel_likes) -> reelStats",
          { reel_id: reelId },
        );
        return;
      }
    }

    // Unknown business_reel subtype → owner's reels list
    openOwnerReelsList(router, { fromInAppList: options?.fromInAppList });
    Logger.log(
      `------>navigateFromNotificationData (business_reel/${subType ?? "unknown"}) -> mediaLibrary`,
    );
    return;
  }

  if (!options?.skipNotificationScreen) {
    router.push("/(main)/notification" as any);
  }
}
