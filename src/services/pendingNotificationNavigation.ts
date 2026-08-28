import * as Notifications from "expo-notifications";
import type { Router } from "expo-router";
import { InteractionManager } from "react-native";
import Logger from "@/src/services/logger";
import {
  navigateFromNotificationData,
  type NotificationNavigationData,
} from "@/src/services/notificationNavigation";

let pendingData: NotificationNavigationData | undefined;
let coldStartResponseChecked = false;

const COLD_START_NAVIGATION_DELAY_MS = 100;

export function setPendingNotificationData(
  data: NotificationNavigationData | undefined,
): void {
  if (!data?.type) return;
  pendingData = data;
  Logger.log("------>setPendingNotificationData", data);
}

export function clearPendingNotificationData(): void {
  pendingData = undefined;
}

export function hasPendingNotificationData(): boolean {
  return !!pendingData?.type;
}

/**
 * On cold start (app killed), read the notification that opened the app and queue
 * navigation until the splash screen has finished and the main stack is mounted.
 */
export async function queueColdStartNotificationIfNeeded(): Promise<boolean> {
  if (coldStartResponseChecked) {
    return hasPendingNotificationData();
  }
  coldStartResponseChecked = true;

  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return false;

  const data = response.notification.request.content.data as
    | NotificationNavigationData
    | undefined;
  if (!data?.type) return false;

  setPendingNotificationData(data);
  Logger.log("------>queueColdStartNotificationIfNeeded", data);
  return true;
}

export async function clearLastNotificationResponse(): Promise<void> {
  try {
    await Notifications.clearLastNotificationResponseAsync();
  } catch (error) {
    Logger.warn("clearLastNotificationResponse failed:", error);
  }
}

/**
 * Navigate to the queued notification target after app shell is ready (post-splash).
 */
export function consumePendingNotificationNavigation(router: Router): void {
  const data = pendingData;
  if (!data?.type) return;

  clearPendingNotificationData();

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      navigateFromNotificationData(router, data);
      void clearLastNotificationResponse();
      Logger.log("------>consumePendingNotificationNavigation", data);
    }, COLD_START_NAVIGATION_DELAY_MS);
  });
}
