import { router } from "expo-router";
import { InteractionManager } from "react-native";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

/**
 * Shared offer link (Profile Promotions):
 *   https://<site>/offers/12            (universal / app link, once backend claims it)
 *   com.freshpass://offers/12?source=email
 * Held like the "Book Again" link until home is up, then the offer screen opens.
 * Guests can view offers (public token); signed-out users wait for sign-in.
 */
export type OfferLinkTarget = { id: string; source: string };

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
  for (const pair of query.split("&")) {
    const [key, value = ""] = pair.split("=");
    if (key === "source" && ["link", "email", "reel", "profile"].includes(value)) {
      source = value;
    }
  }
  return { id: match[2], source };
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
        params: { id: target.id, source: target.source },
      });
    }, OPEN_DELAY_MS);
  });
}
