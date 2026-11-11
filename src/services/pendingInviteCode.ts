import * as Application from "expo-application";
import i18n from "i18next";
import { Clipboard, InteractionManager, Platform } from "react-native";
import { router } from "expo-router";
import { ApiService, showToast } from "@/src/services/api";
import { businessEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { LocalStorageService } from "@/src/services/storage";
import { store } from "@/src/state/store";
import { setRole } from "@/src/state/slices/generalSlice";
import { MAIN_ROUTES } from "@/src/constant/routes";

/**
 * "Invite a Pro" code, held until a new business signs up:
 *   https://getfreshpass.com/invite/{code}   (universal / app link)
 *   com.freshpass://invite?code={CODE}       (web page "I already have the app")
 *   Play install referrer invite_code={CODE} (Android, first launch)
 *   GET /api/invite-codes/deferred           (iPhone, first launch + business signup)
 *   Clipboard FRESHPASS-INVITE:{CODE}        (iPad, read at business signup)
 * Kept in its own AsyncStorage key (not redux-persist), so it survives app
 * kill and sign-out. Sent as invite_code at business signup, then cleared.
 */
const CODE_KEY = "pendingInviteCode";
const REFERRER_CHECKED_KEY = "inviteReferrerChecked";
const DEFERRED_CHECKED_KEY = "inviteDeferredChecked";
const CLIPBOARD_PREFIX = "FRESHPASS-INVITE:";
// Business signup waits at most this long for the deferred lookup
const DEFERRED_SIGNUP_TIMEOUT_MS = 4000;

const isIphone = Platform.OS === "ios" && !Platform.isPad;
const isIpad = Platform.OS === "ios" && Platform.isPad;

// Same as booking links: let home mount before showing the notice
const OPEN_DELAY_MS = 100;

let cachedCode: string | null = null;
let loaded = false;
let loading: Promise<void> | null = null;
// One-shot: set when a link was just opened, cleared the first time home is up
let noticePending = false;
// iPhone clipboard is read at most once per app session
let clipboardChecked = false;

/** Upper-case letters and digits only; the server decides if it is valid. */
export function normalizeInviteCode(text?: string | null): string | null {
  if (!text) return null;
  const code = String(text)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return code.length >= 4 && code.length <= 16 ? code : null;
}

function stripQuery(url: string): { path: string; query: string } {
  const withoutHash = url.split("#")[0];
  const index = withoutHash.indexOf("?");
  if (index === -1) return { path: withoutHash, query: "" };
  return {
    path: withoutHash.slice(0, index),
    query: withoutHash.slice(index + 1),
  };
}

function readQuery(query: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const [rawKey, rawValue = ""] = pair.split("=");
    try {
      values[decodeURIComponent(rawKey)] = decodeURIComponent(
        rawValue.replace(/\+/g, " "),
      ).trim();
    } catch {
      // Malformed escape — skip this pair
    }
  }
  return values;
}

function withoutScheme(path: string): string {
  return path.replace(/^[a-z][\w+.-]*:\/\//i, "");
}

/** True for `/invite/{code}` and the `com.freshpass://invite?code=` link. */
export function isInviteLink(url: string): boolean {
  // "getfreshpass.com/invite/K7M2QX9P", "invite" (custom-scheme host), "/invite"
  return /(^|\/)invite(\/[^/]+)?\/?$/i.test(
    withoutScheme(stripQuery(url).path),
  );
}

/** The code from the path segment, else from `?code=`; null when missing/bad. */
export function parseInviteLinkCode(url: string): string | null {
  const { path, query } = stripQuery(url);
  const match = withoutScheme(path).match(/(^|\/)invite\/([^/]+)\/?$/i);
  let segment: string | undefined;
  if (match) {
    try {
      segment = decodeURIComponent(match[2]);
    } catch {
      segment = match[2];
    }
  }
  return normalizeInviteCode(segment || readQuery(query).code);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loading) {
    loading = (async () => {
      const stored = await LocalStorageService.getItem(CODE_KEY);
      // A link may have set a newer code while storage was being read
      if (!loaded) {
        cachedCode = normalizeInviteCode(stored);
        loaded = true;
      }
    })();
  }
  await loading;
}

function saveCode(code: string): void {
  cachedCode = code;
  loaded = true;
  LocalStorageService.setItem(CODE_KEY, code).catch(() => {
    // Logged by LocalStorageService; the module cache still has it this session
  });
}

/** Link opened: the newest link wins. Bad / missing code → ignored. */
export function holdInviteFromLink(code: string | null): void {
  const normalized = normalizeInviteCode(code);
  Logger.log("------>holdInviteFromLink", normalized);
  if (!normalized) return;
  saveCode(normalized);
  noticePending = true;
}

/**
 * Called when home is up (resetToDashboardHome), at splash and for a warm link.
 * Signed in (any role or mode): "This invite is for new businesses", once;
 * nothing is recorded and the code stays held. Signed out: business signup
 * opens (openBusinessSignupForInvite). Guest: silent.
 */
/** Signed in (any role or mode) and not a guest. */
export function isInviteNoticeUserSignedIn(): boolean {
  const user = store.getState().user;
  return !!user.accessToken && !!user.userRole && !user.isGuest;
}

export function openPendingInviteNotice(): void {
  if (!noticePending) return;
  noticePending = false;

  if (!isInviteNoticeUserSignedIn()) {
    openBusinessSignupForInvite();
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      const title = i18n.isInitialized
        ? i18n.t("inviteLinkForNewBusinessesTitle")
        : "This invite is for new businesses";
      const message = i18n.isInitialized
        ? i18n.t("inviteLinkForNewBusinessesMessage")
        : "Only a new business account can use an invite code.";
      showToast(title, message, "info");
    }, OPEN_DELAY_MS);
  });
}

/**
 * Signed out (not a guest) and an invite link was just opened: go straight to
 * business signup (Business picked; the code fills the Invite code field).
 * Skipped when Business is already picked — they are already in that flow.
 */
function openBusinessSignupForInvite(): void {
  const state = store.getState();
  if (state.user.isGuest || state.general.role === "business") return;
  store.dispatch(setRole("business"));
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      router.push(`/(main)/${MAIN_ROUTES.SOCIAL_LOGIN}` as any);
      Logger.log("------>invite link (signed out) -> business signup");
    }, OPEN_DELAY_MS);
  });
}

/** Fire-and-forget at launch so the first read is instant later. */
export function preloadPendingInviteCode(): void {
  void ensureLoaded();
}

export async function getPendingInviteCode(): Promise<string | null> {
  await ensureLoaded();
  return cachedCode;
}

export async function clearPendingInviteCode(): Promise<void> {
  cachedCode = null;
  loaded = true;
  noticePending = false;
  try {
    await LocalStorageService.removeItem(CODE_KEY);
  } catch {
    // Logged by LocalStorageService
  }
}

/** Play referrer "invite_code=K7M2QX9P" (sometimes still URL-encoded). */
function parseReferrerCode(referrer: string): string | null {
  let raw = referrer.trim();
  if (/%[0-9a-f]{2}/i.test(raw)) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Keep the raw text
    }
  }
  return normalizeInviteCode(readQuery(raw).invite_code);
}

/**
 * Android only, once per install: Google Play install referrer from the
 * invite page's "Get the FreshPass app" button. Only fills an empty slot
 * (a link is newer and explicit). Never throws.
 */
export async function captureInstallReferrerInviteOnce(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const checked = await LocalStorageService.getItem(REFERRER_CHECKED_KEY);
    if (checked) return;

    let referrer = "";
    try {
      referrer = (await Application.getInstallReferrerAsync()) || "";
    } catch (error: any) {
      // No Play Store / sideload: it never comes, stop asking.
      // Lost connection etc.: try again next launch.
      if (error?.code === "ERR_APPLICATION_INSTALL_REFERRER_UNAVAILABLE") {
        await LocalStorageService.setItem(REFERRER_CHECKED_KEY, "1");
      }
      Logger.warn("Install referrer unavailable:", error?.code || error);
      return;
    }

    await LocalStorageService.setItem(REFERRER_CHECKED_KEY, "1");
    const code = parseReferrerCode(referrer);
    Logger.log("------>install referrer invite", code);
    if (!code) return;
    await ensureLoaded();
    if (!cachedCode) saveCode(code);
  } catch (error) {
    Logger.warn("captureInstallReferrerInviteOnce failed:", error);
  }
}

/**
 * iPhone: GET /api/invite-codes/deferred — the newest unclaimed invite click
 * from this IP (48h). Each click is handed out once, so only call it when no
 * code is held. Returns the code (saved) or null. Never throws.
 */
async function fetchDeferredInvite(): Promise<string | null> {
  const response = await ApiService.get<any>(
    businessEndpoints.inviteCodeDeferred,
  );
  const payload = response?.data ?? response;
  const code = normalizeInviteCode(payload?.invite_code);
  Logger.log("------>deferred invite", code);
  if (code && !cachedCode) saveCode(code);
  return code;
}

/**
 * iPhone, once per install (first launch): after an App Store install from an
 * invite link. Skipped when a link already gave a code. A 404 (no click)
 * counts as checked; a network error is retried next launch.
 */
export async function captureDeferredInviteOnFirstLaunch(): Promise<void> {
  if (!isIphone) return;
  try {
    const checked = await LocalStorageService.getItem(DEFERRED_CHECKED_KEY);
    if (checked) return;
    await ensureLoaded();
    if (cachedCode) {
      await LocalStorageService.setItem(DEFERRED_CHECKED_KEY, "1");
      return;
    }
    try {
      await fetchDeferredInvite();
    } catch (error: any) {
      if (error?.status !== 404) {
        Logger.warn("Deferred invite (first launch) failed:", error?.message);
        return;
      }
    }
    await LocalStorageService.setItem(DEFERRED_CHECKED_KEY, "1");
  } catch (error) {
    Logger.warn("captureDeferredInviteOnFirstLaunch failed:", error);
  }
}

let deferredSignupChecked = false;

/**
 * iPhone, business signup with no code yet (e.g. the app was installed but an
 * in-app browser still sent them to the App Store). At most once per session,
 * waits at most DEFERRED_SIGNUP_TIMEOUT_MS. Never throws.
 */
export async function captureDeferredInviteForSignup(): Promise<void> {
  if (!isIphone || deferredSignupChecked) return;
  try {
    await ensureLoaded();
    if (cachedCode) return;
    deferredSignupChecked = true;
    await Promise.race([
      fetchDeferredInvite().catch((error: any) => {
        if (error?.status !== 404) {
          Logger.warn("Deferred invite (signup) failed:", error?.message);
        }
        return null;
      }),
      new Promise((resolve) => setTimeout(resolve, DEFERRED_SIGNUP_TIMEOUT_MS)),
    ]);
  } catch (error) {
    Logger.warn("captureDeferredInviteForSignup failed:", error);
  }
}

/**
 * Business signup on iPhone or iPad: iPhone asks the server (deferred click),
 * iPad reads the clipboard the invite page wrote. Only when no code is held.
 */
export async function captureInviteForBusinessSignup(): Promise<void> {
  if (isIpad) await captureIosClipboardInviteOnce();
  else await captureDeferredInviteForSignup();
}

/**
 * iPad only, when the user picks business: the invite page copies
 * "FRESHPASS-INVITE:{CODE}" before opening the App Store.
 * At most once per app session, only when no code is held. Never throws.
 * (iOS shows its own "Allow Paste" prompt.)
 */
export async function captureIosClipboardInviteOnce(): Promise<void> {
  if (!isIpad || clipboardChecked) return;
  try {
    await ensureLoaded();
    if (cachedCode) return;
    clipboardChecked = true;
    const text = ((await Clipboard.getString()) || "").trim();
    if (!text.startsWith(CLIPBOARD_PREFIX)) return;
    const code = normalizeInviteCode(text.slice(CLIPBOARD_PREFIX.length));
    Logger.log("------>clipboard invite", code);
    if (code && !cachedCode) saveCode(code);
  } catch (error) {
    Logger.warn("captureIosClipboardInviteOnce failed:", error);
  }
}
