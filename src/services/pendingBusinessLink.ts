import { router } from "expo-router";
import { InteractionManager } from "react-native";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

/**
 * Business "Your Page Link" (owner shares it on Instagram / TikTok):
 *   https://getfreshpass.com/example-barbershop
 * Held like the other links until home is up, then the slug is resolved
 * (public API, old slugs too) and Business Detail opens.
 * Only https links on getfreshpass.com count — app scheme links
 * (com.freshpass://dashboard, dev client links…) are never treated as slugs.
 */
let pendingSlug: string | undefined;

const OPEN_DELAY_MS = 100;

// Website pages that are not business pages (others have their own handlers)
const RESERVED = new Set([
  "book",
  "open",
  "login",
  "register",
  "signup",
  "privacy",
  "terms",
  "businesses",
  "offers",
  "invite",
  "r",
  "o",
]);

const SITE_LINK = /^https?:\/\/(?:[\w-]+\.)*getfreshpass\.com\/([^/?#]+)\/?(?:[?#].*)?$/i;
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

/** Slug from https://getfreshpass.com/{slug}, or null if it is not one. */
export function parseBusinessSlug(url: string): string | null {
  const match = url.trim().match(SITE_LINK);
  if (!match) return null;
  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    return null;
  }
  if (!SLUG.test(slug) || RESERVED.has(slug.toLowerCase())) return null;
  return slug;
}

/**
 * Any one-segment website page (getfreshpass.com/privacy, /terms…). Android
 * claims all of them for business links, so the ones that are not a business
 * must not fall through to Expo Router (no such route → not-found screen).
 * The browser can't take them back: Linking.openURL would loop into the app.
 */
export function isSitePageLink(url: string): boolean {
  return SITE_LINK.test(url.trim());
}

export function isBusinessProfileLink(url: string): boolean {
  return parseBusinessSlug(url) !== null;
}

export function setPendingBusinessSlug(slug: string | null): void {
  pendingSlug = slug ?? undefined;
  Logger.log("------>setPendingBusinessSlug", slug);
}

/** Called once home is up (resetToDashboardHome) and for warm links. */
export function openPendingBusinessLink(): void {
  const slug = pendingSlug;
  if (!slug) return;
  const user = store.getState().user;
  // Signed out (sign-in screens): keep it for after login
  if (!user.isGuest && !user.accessToken) return;

  pendingSlug = undefined;
  void (async () => {
    try {
      const response = await ApiService.get<any>(
        businessEndpoints.resolveSlug(slug),
      );
      const businessId = (response?.data ?? response)?.business_id;
      if (!businessId) return;
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          router.push({
            pathname: "/(main)/businessDetail",
            params: { business_id: String(businessId) },
          } as any);
        }, OPEN_DELAY_MS);
      });
    } catch (error) {
      // 404 = no such business → just stay on home
      Logger.warn("resolve business slug failed:", slug, error);
    }
  })();
}
