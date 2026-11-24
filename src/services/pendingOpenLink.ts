import { router } from "expo-router";
import { InteractionManager } from "react-native";
import Logger from "@/src/services/logger";
import {
  navigateFromNotificationData,
  navigateFromPushNotification,
} from "@/src/services/notificationNavigation";
import { store } from "@/src/state/store";

/**
 * Email buttons that go through the website's /open page:
 *   https://getfreshpass.com/open?type=ai_tools&web=/settings/ai-tools   (universal link, later)
 *   com.freshpass://open?type=ai_tools                                    (web page fallback)
 * The query is treated like push data (type, ids…), held until home is up,
 * then opened with the same navigation as a push tap.
 */
type OpenLinkData = Record<string, string>;

let pendingData: OpenLinkData | undefined;

const OPEN_DELAY_MS = 100;

function splitUrl(url: string): { path: string; query: string } {
  const withoutHash = url.split("#")[0];
  const index = withoutHash.indexOf("?");
  return index === -1
    ? { path: withoutHash, query: "" }
    : { path: withoutHash.slice(0, index), query: withoutHash.slice(index + 1) };
}

/** "com.freshpass://open", "https://getfreshpass.com/open", "/open" */
export function isOpenLink(url: string): boolean {
  const withoutScheme = splitUrl(url).path.replace(/^[a-z][\w+.-]*:\/\//i, "");
  return /(^|\/)open\/?$/.test(withoutScheme);
}

export function parseOpenLink(url: string): OpenLinkData | null {
  const data: OpenLinkData = {};
  for (const pair of splitUrl(url).query.split("&")) {
    if (!pair) continue;
    const [key, raw = ""] = pair.split("=");
    try {
      data[decodeURIComponent(key)] = decodeURIComponent(raw.replace(/\+/g, " ")).trim();
    } catch {
      // Malformed escape — skip this pair
    }
  }
  // `web` is the website fallback path, not app data
  delete data.web;
  return data.type ? data : null;
}

export function setPendingOpenLink(data: OpenLinkData | null): void {
  pendingData = data ?? undefined;
  Logger.log("------>setPendingOpenLink", data);
}

/** Called once home is up (resetToDashboardHome) and for warm links. */
export function openPendingOpenLink(): void {
  const data = pendingData;
  if (!data) return;
  const user = store.getState().user;
  // Signed out (sign-in screens): keep it for after login
  if (!user.isGuest && !user.accessToken) return;

  pendingData = undefined;
  // Credits are bought on the customer side: an owner/staff with a customer
  // side is switched to it first (same as a push with mode "customer")
  if (data.type === "ai_tools" && !data.mode) data.mode = "customer";

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      // Unknown type → stay on home (no notification list), with or without mode
      if (data.mode) {
        void navigateFromPushNotification(router, data as any, {
          skipNotificationScreen: true,
        });
        return;
      }
      navigateFromNotificationData(router, data as any, {
        skipNotificationScreen: true,
      });
    }, OPEN_DELAY_MS);
  });
}
