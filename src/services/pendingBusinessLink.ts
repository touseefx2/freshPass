import { router } from "expo-router";
import { InteractionManager } from "react-native";
import { ApiService } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

/**
 * Website links (getfreshpass.com / dev.getfreshpass.com) that reach the app.
 *
 * Business page links open Business Detail:
 *   https://getfreshpass.com/example-barbershop            ("Your Page Link")
 *   https://getfreshpass.com/businesses/example-barbershop (customer Share)
 * Held like the other links until home is up, then the slug is resolved
 * (public API, old slugs too).
 *
 * Every other site page is shown in the app's WebView (sitePage): Android
 * claims all one-page links and the iOS AASA claims almost every path, so
 * these land in the app, and the browser can't take them back
 * (Linking.openURL would loop straight into the app again).
 * Only http(s) links on getfreshpass.com count — app scheme links
 * (com.freshpass://dashboard, dev client links…) are never touched.
 */
let pendingSlug: { slug: string; url: string } | undefined;
let pendingSitePage: string | undefined;

const OPEN_DELAY_MS = 100;

const SITE_LINK = /^https?:\/\/(?:[\w-]+\.)*getfreshpass\.com(?=[/?#]|$)/i;
const SLUG = /^[a-z0-9][a-z0-9_-]*$/i;

// One-page site paths that are never a business (no API call for these)
const RESERVED = new Set([
  "book",
  "open",
  "login",
  "logout",
  "register",
  "signup",
  "privacy",
  "privacy-policy",
  "terms",
  "terms-and-conditions",
  "support",
  "download",
  "businesses",
  "offers",
  "deals",
  "jobs",
  "invite",
  "r",
  "o",
]);

/** Path segments of a site link ("/a/b?x" → ["a", "b"]), or null if not a site link. */
function siteSegments(url: string): string[] | null {
  const trimmed = url.trim();
  const match = trimmed.match(SITE_LINK);
  if (!match) return null;
  const path = trimmed.slice(match[0].length).split(/[?#]/)[0];
  return path.split("/").filter(Boolean);
}

/** Any http(s) link on getfreshpass.com or a subdomain (dev.…). */
export function isSitePageLink(url: string): boolean {
  return siteSegments(url) !== null;
}

/** Site home (getfreshpass.com/) — just open the app. */
export function isSiteHomeLink(url: string): boolean {
  return siteSegments(url)?.length === 0;
}

/** Reel share links (/r/{id}) have their own app route. */
export function isSiteReelLink(url: string): boolean {
  return siteSegments(url)?.[0]?.toLowerCase() === "r";
}

/** Slug from /{slug} or /businesses/{slug}, or null if it is not one. */
export function parseBusinessSlug(url: string): string | null {
  const segments = siteSegments(url);
  if (!segments) return null;
  let raw: string | undefined;
  if (segments.length === 1) raw = segments[0];
  else if (segments.length === 2 && segments[0].toLowerCase() === "businesses") {
    raw = segments[1];
  }
  if (!raw) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (!SLUG.test(slug)) return null;
  // /businesses/{slug} is always a business; /{slug} skips known site pages
  if (segments.length === 1 && RESERVED.has(slug.toLowerCase())) return null;
  return slug;
}

/** https version of a site link for the WebView, or null if it is not one. */
export function safeSitePageUrl(url: string | undefined | null): string | null {
  if (typeof url !== "string" || !isSitePageLink(url)) return null;
  return url.trim().replace(/^http:\/\//i, "https://");
}

/** Route that shows a site page in the WebView. */
export function sitePageHref(url: string): string {
  return `/sitePage?url=${encodeURIComponent(url.trim())}`;
}

function showSitePage(url: string | undefined): void {
  const safeUrl = safeSitePageUrl(url);
  if (!safeUrl) return;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => router.push(sitePageHref(safeUrl) as any), OPEN_DELAY_MS);
  });
}

/** Cold start: the page opens once home is up (signed in or guest). */
export function setPendingSitePage(url: string): void {
  pendingSitePage = url.trim();
}

/** `url` = the full link, shown in the WebView if the slug is not a business. */
export function setPendingBusinessSlug(slug: string | null, url = ""): void {
  pendingSlug = slug ? { slug, url: url.trim() } : undefined;
  Logger.log("------>setPendingBusinessSlug", slug);
}

/** Called once home is up (resetToDashboardHome) and for warm links. */
export function openPendingBusinessLink(): void {
  const page = pendingSitePage;
  pendingSitePage = undefined;
  showSitePage(page);

  const pending = pendingSlug;
  if (!pending) return;
  const user = store.getState().user;
  // Signed out (sign-in screens): keep it for after login
  if (!user.isGuest && !user.accessToken) return;

  pendingSlug = undefined;
  const { slug, url } = pending;
  void (async () => {
    try {
      const response = await ApiService.get<any>(
        businessEndpoints.resolveSlug(slug),
      );
      const businessId = (response?.data ?? response)?.business_id;
      if (!businessId) {
        showSitePage(url);
        return;
      }
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          router.push({
            pathname: "/(main)/businessDetail",
            params: { business_id: String(businessId) },
          } as any);
        }, OPEN_DELAY_MS);
      });
    } catch (error) {
      // 404 = not a business (/pricing, /about…) → show the page itself
      Logger.warn("resolve business slug failed:", slug, error);
      showSitePage(url);
    }
  })();
}
