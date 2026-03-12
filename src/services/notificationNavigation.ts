import type { Router } from "expo-router";
import Logger from "@/src/services/logger";

export type NotificationNavigationData = {
  type?: string | null;
  model_id?: number | null;
  sender?: {
    id: number;
    name?: string;
    profile_image_url?: string | null;
  } | null;
} & Record<string, unknown>;

/**
 * Navigate based on notification data (push payload or API notification item).
 * Used by ExpoNotificationHandler (push tap) and Notifications screen (list item tap).
 * - type "message" + model_id + sender → chatBox
 * - type "appointment" + model_id → bookingDetailsById
 * - type "ai_memory" → aiMemories (AI memories screen)
 * - otherwise → notification screen (unless options.skipNotificationScreen is true, e.g. when already on that screen)
 */
export function navigateFromNotificationData(
  router: Router,
  data: NotificationNavigationData | undefined,
  options?: { skipNotificationScreen?: boolean },
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
      router.push({
        pathname: "/(main)/bookingDetailsById",
        params: { bookingId: modelId },
      });
      Logger.log(
        "------>navigateFromNotificationData (appointment) -> bookingDetailsById",
        { bookingId: modelId },
      );
      return;
    }
  }

  if (type === "ai_memory") {
    router.push("/(main)/aiMemories" as any);
    Logger.log("------>navigateFromNotificationData (ai_memory) -> aiMemories");
    return;
  }

  if (!options?.skipNotificationScreen) {
    router.push("/(main)/notification" as any);
  }
}
