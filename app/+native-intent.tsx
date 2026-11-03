import Logger from "@/src/services/logger";
import {
  isAppShellReady,
  isBookingLink,
  openPendingBookingLink,
  parseBookingLink,
  setPendingBookingLink,
} from "@/src/services/pendingBookingLink";

/** Stripe billing portal "return" link: com.freshpass://dashboard/subscription */
function isSubscriptionReturnLink(path: string): boolean {
  const withoutScheme = path
    .split(/[?#]/)[0]
    .replace(/^[a-z][\w+.-]*:\/\//i, "");
  return /^\/?dashboard\/subscription\/?$/.test(withoutScheme);
}

/**
 * Every incoming link passes through here before Expo Router opens it.
 * Booking links never open their screen directly: they wait until the app is
 * ready (splash done, home mounted, signed in) and then open booking on top of home.
 * The billing-portal return link only opens its screen while the app is running.
 * Other links (reels, etc.) are unchanged.
 */
export function redirectSystemPath({
  path,
  initial,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // Back from the card page. Warm: Expo Router reuses Manage Subscription
    // (already on top) and it refetches on foreground. Cold start: run the
    // splash like any launch instead of opening the screen before sign-in.
    if (isSubscriptionReturnLink(path)) return initial ? "/" : path;

    if (!isBookingLink(path)) return path;

    // Bad / missing businessId → just open the app
    setPendingBookingLink(parseBookingLink(path));

    // Cold start: run the splash; it opens home and then booking
    if (initial) return "/";

    // App already running: open now if home is up, otherwise it waits for
    // the splash / login. "" = stay on the current screen.
    if (isAppShellReady()) openPendingBookingLink();
    return "";
  } catch (error) {
    Logger.warn("redirectSystemPath failed:", error);
    return initial ? "/" : path;
  }
}
