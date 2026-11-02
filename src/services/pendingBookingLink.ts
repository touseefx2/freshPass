import { router } from "expo-router";
import { InteractionManager } from "react-native";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";
import { setGuestModeModalVisible } from "@/src/state/slices/generalSlice";
import { switchActiveMode } from "@/src/state/thunks/userModeThunks";

/**
 * "Book Again Now" link from the thank-you email:
 *   https://getfreshpass.com/book?businessId=1&staffId=2   (universal / app link)
 *   com.freshpass://bookingNow?business_id=1&staff_id=2    (web page fallback button)
 * The link is held until the app is ready (splash done, home mounted, signed in),
 * then booking opens on top of home.
 */
export type BookingLinkTarget = { business_id: string; staff_id: string };

let pendingTarget: BookingLinkTarget | undefined;
// Guest sign-in popup shows once per link; the link still waits for login
let guestPromptShown = false;
// Set once home has been mounted after the splash (resetToDashboardHome)
let appShellReady = false;

// Same as cold-start push taps: let home mount before pushing booking
const OPEN_DELAY_MS = 100;
// Let the dashboard remount for customer mode before pushing booking
const MODE_SWITCH_DELAY_MS = 150;

function stripQuery(url: string): { path: string; query: string } {
  const withoutHash = url.split("#")[0];
  const index = withoutHash.indexOf("?");
  if (index === -1) return { path: withoutHash, query: "" };
  return {
    path: withoutHash.slice(0, index),
    query: withoutHash.slice(index + 1),
  };
}

function readQuery(query: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [rawKey, rawValue = ""] = pair.split("=");
    try {
      values[decodeURIComponent(rawKey)] = decodeURIComponent(
        rawValue.replace(/\+/g, " "),
      ).trim();
    } catch {
      // Malformed escape — skip this pair
    }
  }
  return values;
}

/** True for the email `/book` link and the `bookingNow` custom-scheme link. */
export function isBookingLink(url: string): boolean {
  const { path } = stripQuery(url);
  // "https://getfreshpass.com/book", "com.freshpass://bookingNow", "/book"
  const withoutScheme = path.replace(/^[a-z][\w+.-]*:\/\//i, "");
  return /(^|\/)(book|bookingNow)\/?$/.test(withoutScheme);
}

/** Business id must be numeric; staff id falls back to "anyone". */
export function parseBookingLink(url: string): BookingLinkTarget | null {
  const values = readQuery(stripQuery(url).query);
  const businessId = values.businessId || values.business_id;
  if (!businessId || !/^\d+$/.test(businessId)) return null;
  const staffId = values.staffId || values.staff_id;
  return {
    business_id: businessId,
    staff_id: staffId && /^\d+$/.test(staffId) ? staffId : "anyone",
  };
}

export function setPendingBookingLink(target: BookingLinkTarget | null): void {
  pendingTarget = target ?? undefined;
  guestPromptShown = false;
  Logger.log("------>setPendingBookingLink", target);
}

export function isAppShellReady(): boolean {
  return appShellReady;
}

function pushBookingNow(target: BookingLinkTarget): void {
  router.push({
    pathname: "/(main)/bookingNow",
    params: { business_id: target.business_id, staff_id: target.staff_id },
  });
  Logger.log("------>openPendingBookingLink -> bookingNow", target);
}

async function openBookingTarget(target: BookingLinkTarget): Promise<void> {
  const user = store.getState().user;

  // Business/staff in business mode: booking is a customer action
  if (user.userRole !== "customer" && user.can_switch_mode) {
    try {
      await store.dispatch(switchActiveMode("customer")).unwrap();
      // Home remounts for customer mode; booking opens from that call
      pendingTarget = target;
      router.replace("/(main)/dashboard/(home)" as any);
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => openPendingBookingLink(), MODE_SWITCH_DELAY_MS);
      });
      return;
    } catch (error) {
      Logger.warn("Booking link mode switch failed:", error);
    }
  }

  pushBookingNow(target);
}

/**
 * Called after home is (re)mounted. Opens the held booking link once the user
 * is signed in; guests get the sign-in popup and the link waits for login.
 */
export function openPendingBookingLink(): void {
  appShellReady = true;
  const target = pendingTarget;
  if (!target) return;

  const user = store.getState().user;
  if (user.isGuest) {
    // Later "Go Home" resets must not show the popup again
    if (guestPromptShown) return;
    guestPromptShown = true;
    InteractionManager.runAfterInteractions(() => {
      setTimeout(
        () => store.dispatch(setGuestModeModalVisible(true)),
        OPEN_DELAY_MS,
      );
    });
    return;
  }
  // Signed out (sign-in screens) — keep it for after login
  if (!user.accessToken || !user.userRole) return;

  pendingTarget = undefined;
  guestPromptShown = false;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => void openBookingTarget(target), OPEN_DELAY_MS);
  });
}
