import Logger from "@/src/services/logger";
import {
  isAppShellReady,
  isBookingLink,
  openPendingBookingLink,
  parseBookingLink,
  setPendingBookingLink,
} from "@/src/services/pendingBookingLink";
import {
  holdInviteFromLink,
  isInviteLink,
  isInviteNoticeUserSignedIn,
  openPendingInviteNotice,
  parseInviteLinkCode,
} from "@/src/services/pendingInviteCode";
import {
  isOfferLink,
  openPendingOfferLink,
  parseOfferLink,
  setPendingOfferLink,
} from "@/src/services/pendingOfferLink";

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
 * Invite a Pro links never open a screen: the code is held for business signup.
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

    if (isInviteLink(path)) {
      // Kept for business signup. Bad / missing code → just open the app
      holdInviteFromLink(parseInviteLinkCode(path));

      // Cold start: run the splash; home shows the notice if signed in
      if (initial) return "/";

      // App already running: signed in → "This invite is for new businesses".
      // Signed out / guest → clear the notice now (code stays held), so a
      // later sign-in to an existing account never shows it. Signed in but
      // home not up yet (mid-onboarding) → home shows it.
      // "" = stay on the current screen.
      if (isAppShellReady() || !isInviteNoticeUserSignedIn()) {
        openPendingInviteNotice();
      }
      return "";
    }

    // Shared offer link (/offers/{id}): held until home is up, like booking
    if (isOfferLink(path)) {
      const target = parseOfferLink(path);
      if (!target) return initial ? "/" : "";
      setPendingOfferLink(target);
      if (initial) return "/";
      if (isAppShellReady()) openPendingOfferLink();
      return "";
    }

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
