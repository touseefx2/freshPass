import { Href, router } from "expo-router";
import { MAIN_ROUTES } from "@/src/constant/routes";

/**
 * Clears the auth/onboarding stack and navigates to a single destination.
 * Use after login or when entering the main app so swipe-back cannot return
 * to role selection, social login, or login screens.
 */
export function resetToRoute(href: Href) {
  router.dismissAll();
  router.replace(href);
}

export function resetToDashboardHome() {
  resetToRoute(`/(main)/${MAIN_ROUTES.DASHBOARD}/(home)` as Href);
}
