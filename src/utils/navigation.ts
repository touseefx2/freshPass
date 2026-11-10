import { Href, router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { openPendingBookingLink } from "@/src/services/pendingBookingLink";
import { openPendingInviteNotice } from "@/src/services/pendingInviteCode";

/**
 * Clears the auth/onboarding stack and navigates to a single destination.
 * Use after login or when entering the main app so swipe-back cannot return
 * to role selection, social login, or login screens.
 */
export function resetToRoute(href: Href) {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace(href);
}

export function resetToDashboardHome() {
  resetToRoute(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as Href);
  // Home is up (after splash / login) — open a held "Book Again" link, if any
  openPendingBookingLink();
  // An invite link was just opened while signed in → one-time notice
  openPendingInviteNotice();
}

/** Profile tab → a Business Management screen, so back returns to Profile. */
export function openBusinessSettingsScreen(screen: string, stepMs = 5) {
  router.push("/(main)/dashboard/(account)" as Href);
  setTimeout(() => {
    router.push(
      `/(main)/dashboard/(account)/(businessProfileSettings)/${screen}` as Href,
    );
  }, stepMs);
}
