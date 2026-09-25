import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseProjectConfig } from "@/src/config/firebaseNative";
import Logger from "@/src/services/logger";

const INSTANCE_ID_KEY = "@freshpass/firebase_rc_instance_id";
const PURCHASE_RC_CACHE = "@freshpass/purchase_remote_config";

/** Firebase Remote Config parameter keys shared across features */
export const REMOTE_CONFIG_KEYS = {
  trialDays: "trial_days",
} as const;

/** Default media / tutorial URLs from Remote Config */
export const DEFAULT_MEDIA_RC_KEYS = {
  defaultAiRequestsImage: "default_ai_requests_image",
  defaultAvatarImage: "default_avatar_image",
  defaultBusinessImage: "default_business_image",
  defaultBusinessLogo: "default_business_logo",
  defaultCategoryImage: "default_category_image",
  tutorialVideoTryonUri: "tutorial_video_tryon_uri",
} as const;

export type PurchaseRemoteConfig = {
  trialDays: string;
};

export type DefaultMediaRemoteConfig = {
  defaultAiRequestsImage: string;
  defaultAvatarImage: string;
  defaultBusinessImage: string;
  defaultBusinessLogo: string;
  defaultCategoryImage: string;
  tutorialVideoTryonUri: string;
};

/** In-app fallbacks used until Remote Config is fetched (match RC template defaults). */
const DEFAULT_MEDIA_FALLBACKS: DefaultMediaRemoteConfig = {
  defaultAiRequestsImage:
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&auto=format",
  defaultAvatarImage:
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop&auto=format",
  defaultBusinessImage:
    "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=800&h=600&fit=crop&auto=format",
  defaultBusinessLogo:
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop&auto=format",
  defaultCategoryImage:
    "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop&auto=format",
  tutorialVideoTryonUri: "https://getfreshpass.com/videos/hair-tryon.MP4",
};

const DEFAULT_MEDIA_RC_CACHE = "@freshpass/default_media_remote_config";

const PURCHASE_CONFIG_MISSING_ERROR =
  "Failed to start payment. Purchase configuration is missing. Please try again later.";

let purchaseConfigMemoryCache: PurchaseRemoteConfig | null = null;
let defaultMediaMemoryCache: DefaultMediaRemoteConfig | null = null;

export type RemoteConfigEntries = Record<string, { value?: string } | string>;

export function getAppVersionForRemoteConfig(): string {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "0.0.0"
  );
}

export function readRemoteConfigEntry(
  entries: RemoteConfigEntries | undefined,
  key: string,
): string | undefined {
  if (!entries) return undefined;
  const raw = entries[key];
  if (raw == null) return undefined;
  if (typeof raw === "string") return raw;
  return raw.value;
}

async function getAppInstanceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTANCE_ID_KEY);
  if (existing) return existing;

  const id = `fp_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await AsyncStorage.setItem(INSTANCE_ID_KEY, id);
  return id;
}

export async function fetchRemoteConfigEntries(): Promise<RemoteConfigEntries> {
  const { projectId, apiKey, appId } = getFirebaseProjectConfig();
  const appInstanceId = await getAppInstanceId();
  const currentVersion = getAppVersionForRemoteConfig();

  const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/namespaces/firebase:fetch?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      appId,
      appInstanceId,
      appInstanceIdToken: "",
      languageCode: "en-US",
      platformVersion: String(Platform.Version),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      appVersion: currentVersion,
      packageName: "com.freshpass",
      sdkVersion: "22.1.0",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Remote Config fetch failed (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as {
    entries?: RemoteConfigEntries;
    state?: string;
  };

  if (data.state === "NO_TEMPLATE") {
    Logger.warn(
      "[RemoteConfig] Template not published yet — using defaults",
    );
    return {};
  }

  return data.entries || {};
}

function parseCachedPurchaseConfig(
  raw: string | null,
): PurchaseRemoteConfig | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseRemoteConfig>;
    return toPurchaseConfig(parsed);
  } catch {
    return null;
  }
}

/** Always builds a config object — empty strings are valid "latest" RC values. */
function toPurchaseConfig(
  partial: Partial<PurchaseRemoteConfig>,
): PurchaseRemoteConfig {
  return {
    trialDays: partial.trialDays?.trim() ?? "",
  };
}

function purchaseConfigFromEntries(
  entries: RemoteConfigEntries,
): PurchaseRemoteConfig {
  return toPurchaseConfig({
    trialDays: readRemoteConfigEntry(entries, REMOTE_CONFIG_KEYS.trialDays),
  });
}

/**
 * Trial days from Firebase Remote Config.
 * Order: memory (unless forceRefresh) → Remote Config (always override cache,
 * including empty strings) → AsyncStorage only if fetch fails → throw.
 */
export async function resolvePurchaseRemoteConfig(options?: {
  forceRefresh?: boolean;
}): Promise<PurchaseRemoteConfig> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && purchaseConfigMemoryCache) {
    return purchaseConfigMemoryCache;
  }

  try {
    const entries = await fetchRemoteConfigEntries();
    const fromRemote = purchaseConfigFromEntries(entries);

    // Whatever RC returns (including "") overrides local cache.
    purchaseConfigMemoryCache = fromRemote;
    await AsyncStorage.setItem(PURCHASE_RC_CACHE, JSON.stringify(fromRemote));
    Logger.log("[PurchaseRC] Using Remote Config purchase values", fromRemote);
    return fromRemote;
  } catch (error) {
    Logger.warn("[PurchaseRC] Remote Config fetch failed:", error);
  }

  try {
    const cached = parseCachedPurchaseConfig(
      await AsyncStorage.getItem(PURCHASE_RC_CACHE),
    );
    if (cached) {
      purchaseConfigMemoryCache = cached;
      Logger.log("[PurchaseRC] Using cached purchase values", cached);
      return cached;
    }
  } catch {
    // ignore cache read errors
  }

  Logger.warn("[PurchaseRC] ❌ No purchase config from Remote Config or cache");
  throw new Error(PURCHASE_CONFIG_MISSING_ERROR);
}

/** App open: always fetch Remote Config and override local cache with latest. */
export async function prefetchPurchaseRemoteConfig(): Promise<void> {
  try {
    await resolvePurchaseRemoteConfig({ forceRefresh: true });
  } catch {
    // Missing config surfaces as an error on purchase / trial UI
  }
}

export async function resolveTrialDays(): Promise<string> {
  const config = await resolvePurchaseRemoteConfig();
  return config.trialDays;
}

function pickMediaUrl(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

function toDefaultMediaConfig(
  partial: Partial<DefaultMediaRemoteConfig>,
): DefaultMediaRemoteConfig {
  return {
    defaultAiRequestsImage: pickMediaUrl(
      partial.defaultAiRequestsImage,
      DEFAULT_MEDIA_FALLBACKS.defaultAiRequestsImage,
    ),
    defaultAvatarImage: pickMediaUrl(
      partial.defaultAvatarImage,
      DEFAULT_MEDIA_FALLBACKS.defaultAvatarImage,
    ),
    defaultBusinessImage: pickMediaUrl(
      partial.defaultBusinessImage,
      DEFAULT_MEDIA_FALLBACKS.defaultBusinessImage,
    ),
    defaultBusinessLogo: pickMediaUrl(
      partial.defaultBusinessLogo,
      DEFAULT_MEDIA_FALLBACKS.defaultBusinessLogo,
    ),
    defaultCategoryImage: pickMediaUrl(
      partial.defaultCategoryImage,
      DEFAULT_MEDIA_FALLBACKS.defaultCategoryImage,
    ),
    tutorialVideoTryonUri: pickMediaUrl(
      partial.tutorialVideoTryonUri,
      DEFAULT_MEDIA_FALLBACKS.tutorialVideoTryonUri,
    ),
  };
}

function parseCachedDefaultMediaConfig(
  raw: string | null,
): DefaultMediaRemoteConfig | null {
  if (!raw?.trim()) return null;
  try {
    return toDefaultMediaConfig(
      JSON.parse(raw) as Partial<DefaultMediaRemoteConfig>,
    );
  } catch {
    return null;
  }
}

function defaultMediaFromEntries(
  entries: RemoteConfigEntries,
): DefaultMediaRemoteConfig {
  return toDefaultMediaConfig({
    defaultAiRequestsImage: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.defaultAiRequestsImage,
    ),
    defaultAvatarImage: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.defaultAvatarImage,
    ),
    defaultBusinessImage: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.defaultBusinessImage,
    ),
    defaultBusinessLogo: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.defaultBusinessLogo,
    ),
    defaultCategoryImage: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.defaultCategoryImage,
    ),
    tutorialVideoTryonUri: readRemoteConfigEntry(
      entries,
      DEFAULT_MEDIA_RC_KEYS.tutorialVideoTryonUri,
    ),
  });
}

/**
 * Default media URLs from Firebase Remote Config.
 * Order: memory → Remote Config → AsyncStorage → in-app fallbacks.
 */
export async function resolveDefaultMediaRemoteConfig(options?: {
  forceRefresh?: boolean;
}): Promise<DefaultMediaRemoteConfig> {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && defaultMediaMemoryCache) {
    return defaultMediaMemoryCache;
  }

  try {
    const entries = await fetchRemoteConfigEntries();
    const fromRemote = defaultMediaFromEntries(entries);
    defaultMediaMemoryCache = fromRemote;
    await AsyncStorage.setItem(
      DEFAULT_MEDIA_RC_CACHE,
      JSON.stringify(fromRemote),
    );
    Logger.log("[MediaRC] Using Remote Config default media values", fromRemote);
    return fromRemote;
  } catch (error) {
    Logger.warn("[MediaRC] Remote Config fetch failed:", error);
  }

  try {
    const cached = parseCachedDefaultMediaConfig(
      await AsyncStorage.getItem(DEFAULT_MEDIA_RC_CACHE),
    );
    if (cached) {
      defaultMediaMemoryCache = cached;
      Logger.log("[MediaRC] Using cached default media values", cached);
      return cached;
    }
  } catch {
    // ignore cache read errors
  }

  defaultMediaMemoryCache = DEFAULT_MEDIA_FALLBACKS;
  return DEFAULT_MEDIA_FALLBACKS;
}

/** App open: fetch default media URLs from Remote Config into memory. */
export async function prefetchDefaultMediaRemoteConfig(): Promise<void> {
  try {
    await resolveDefaultMediaRemoteConfig({ forceRefresh: true });
  } catch {
    defaultMediaMemoryCache = DEFAULT_MEDIA_FALLBACKS;
  }
}

function currentDefaultMedia(): DefaultMediaRemoteConfig {
  return defaultMediaMemoryCache ?? DEFAULT_MEDIA_FALLBACKS;
}

export function getDefaultAiRequestsImage(): string {
  return currentDefaultMedia().defaultAiRequestsImage;
}

export function getDefaultAvatarImage(): string {
  return currentDefaultMedia().defaultAvatarImage;
}

export function getDefaultBusinessImage(): string {
  return currentDefaultMedia().defaultBusinessImage;
}

export function getDefaultBusinessLogo(): string {
  return currentDefaultMedia().defaultBusinessLogo;
}

export function getDefaultCategoryImage(): string {
  return currentDefaultMedia().defaultCategoryImage;
}

export function getTutorialVideoTryonUri(): string {
  return currentDefaultMedia().tutorialVideoTryonUri;
}
