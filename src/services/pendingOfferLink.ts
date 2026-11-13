import { router } from "expo-router";
import { InteractionManager, Linking } from "react-native";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

/**
 * Shared offer link (Profile Promotions):
 *   https://<site>/offers/12            (universal / app link, once backend claims it)
 *   com.freshpass://offers/12?source=email
 *   https://<site>/offers/12?claim=<token>&source=email   (Bring Customers Back email)
 * Held like the "Book Again" link until home is up, then the offer screen opens.
 * Guests can view offers (public token); signed-out users wait for sign-in.
 * `claim` unlocks a private (email) offer; it goes with the view, quote and booking.
 */
export type OfferLinkTarget = { id: string; source: string; claim?: string };

let pendingTarget: OfferLinkTarget | undefined;

const OPEN_DELAY_MS = 100;

function splitUrl(url: string): { path: string; query: string } {
  const withoutHash = url.split("#")[0];
  const index = withoutHash.indexOf("?");
  return index === -1
    ? { path: withoutHash, query: "" }
    : { path: withoutHash.slice(0, index), query: withoutHash.slice(index + 1) };
}

const OFFER_PATH = /(^|\/)offers\/(\d+)\/?$/;

export function isOfferLink(url: string): boolean {
  const withoutScheme = splitUrl(url).path.replace(/^[a-z][\w+.-]*:\/\//i, "");
  return OFFER_PATH.test(withoutScheme);
}

export function parseOfferLink(url: string): OfferLinkTarget | null {
  const { path, query } = splitUrl(url);
  const match = path.replace(/^[a-z][\w+.-]*:\/\//i, "").match(OFFER_PATH);
  if (!match) return null;
  let source = "link";
  let claim: string | undefined;
  for (const pair of query.split("&")) {
    const [key, raw = ""] = pair.split("=");
    let value = raw;
    try {
      value = decodeURIComponent(raw);
    } catch {
      // keep raw
    }
    if (key === "source" && ["link", "email", "reel", "profile"].includes(value)) {
      source = value;
    }
    if (key === "claim" && value.trim()) claim = value.trim();
  }
  return { id: match[2], source, ...(claim ? { claim } : {}) };
}

/**
 * Email button link /o/{token}. Only the website can turn the token into an
 * offer (it counts the click, then redirects to /offers/{id}?claim=…), so the
 * app hands it to the browser.
 */
const EMAIL_CLICK_PATH = /(^|\/)o\/([A-Za-z0-9_-]+)\/?$/;

export function isOfferEmailClickLink(url: string): boolean {
  const withoutScheme = splitUrl(url).path.replace(/^[a-z][\w+.-]*:\/\//i, "");
  return EMAIL_CLICK_PATH.test(withoutScheme);
}

export function openOfferEmailClickInBrowser(url: string): void {
  const { path } = splitUrl(url);
  const match = path.replace(/^[a-z][\w+.-]*:\/\//i, "").match(EMAIL_CLICK_PATH);
  if (!match) return;
  const webUrl = /^https?:\/\//i.test(url)
    ? url
    : `${(process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://getfreshpass.com/").replace(/\/+$/, "")}/o/${match[2]}`;
  Linking.openURL(webUrl).catch((error) =>
    Logger.warn("openOfferEmailClickInBrowser failed:", error),
  );
}

export function setPendingOfferLink(target: OfferLinkTarget | null): void {
  pendingTarget = target ?? undefined;
  Logger.log("------>setPendingOfferLink", target);
}

/** Called once home is up (resetToDashboardHome) and for warm links. */
export function openPendingOfferLink(): void {
  const target = pendingTarget;
  if (!target) return;
  const user = store.getState().user;
  // Signed out (sign-in screens): keep it for after login
  if (!user.isGuest && !user.accessToken) return;

  pendingTarget = undefined;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      router.push({
        pathname: "/(main)/offerDetail",
        params: {
          id: target.id,
          source: target.source,
          ...(target.claim ? { claim: target.claim } : {}),
        },
      });
    }, OPEN_DELAY_MS);
  });
}
