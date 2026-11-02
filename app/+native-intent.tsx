import Logger from "@/src/services/logger";
import {
  isAppShellReady,
  isBookingLink,
  openPendingBookingLink,
  parseBookingLink,
  setPendingBookingLink,
} from "@/src/services/pendingBookingLink";

/**
 * Every incoming link passes through here before Expo Router opens it.
 * Booking links never open their screen directly: they wait until the app is
 * ready (splash done, home mounted, signed in) and then open booking on top of home.
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
