import { Href, router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";
import { openPendingBookingLink } from "@/src/services/pendingBookingLink";

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
}

/**
 * Profile tab → a Business Management screen, so back returns through Profile.
 * Solo-layout owners also pass through their Business Management page; on the
 * Business plan those items live on Profile itself (pass viaHub = false).
 */
export function openBusinessSettingsScreen(
  screen: string,
  viaHub: boolean,
  stepMs = 5,
) {
  const hub = "/(main)/dashboard/(account)/(businessProfileSettings)";
  router.push("/(main)/dashboard/(account)" as Href);
  setTimeout(() => {
    if (!viaHub) {
      router.push(`${hub}/${screen}` as Href);
      return;
    }
    router.push(hub as Href);
    setTimeout(() => router.push(`${hub}/${screen}` as Href), stepMs);
  }, stepMs);
}
