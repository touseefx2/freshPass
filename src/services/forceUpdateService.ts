import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseProjectConfig } from "@/src/config/firebaseNative";
import Logger from "@/src/services/logger";

/** Firebase Remote Config parameter keys — set these in Firebase Console */
export const FORCE_UPDATE_RC_KEYS = {
  forceUpdateAndroid: "force_update_android",
  forceUpdateIos: "force_update_ios",
  minVersionAndroid: "min_version_android",
  minVersionIos: "min_version_ios",
  message: "force_update_message",
  androidStoreUrl: "android_store_url",
  iosStoreUrl: "ios_store_url",
} as const;

const INSTANCE_ID_KEY = "@freshpass/firebase_rc_instance_id";

export type ForceUpdateConfig = {
  forceUpdate: boolean;
  minVersion: string;
  message: string;
  storeUrl: string;
  currentVersion: string;
};

type RemoteConfigEntries = Record<string, { value?: string } | string>;

const DEFAULTS = {
  forceUpdateAndroid: false,
  forceUpdateIos: false,
  minVersionAndroid: "0.0.0",
  minVersionIos: "0.0.0",
  message:
    "A new version of FreshPass is required to continue. Please update from the store.",
  androidStoreUrl: "",
  iosStoreUrl: "",
};

export function getCurrentAppVersion(): string {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "0.0.0"
  );
}

function getVersionDebugInfo() {
  return {
    // What force-update compare uses (prefer native binary version)
    currentVersion: getCurrentAppVersion(),
    // Stamped into the installed binary (EAS/Xcode build) — THIS is the source of truth
    nativeApplicationVersion: Application.nativeApplicationVersion ?? null,
    // Build number (CFBundleVersion / versionCode) — NOT used for force update
    nativeBuildVersion: Application.nativeBuildVersion ?? null,
    // From app.json / Expo config embedded at bundle time — fallback only
    expoConfigVersion: Constants.expoConfig?.version ?? null,
  };
}

/** Compare semver-like versions: returns true if current < minimum */
export function isVersionBelowMinimum(
  currentVersion: string,
  minVersion: string,
): boolean {
  const parse = (v: string) =>
    v
      .replace(/[^0-9.]/g, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

  const current = parse(currentVersion);
  const minimum = parse(minVersion);
  const length = Math.max(current.length, minimum.length);

  for (let i = 0; i < length; i += 1) {
    const a = current[i] ?? 0;
    const b = minimum[i] ?? 0;
    if (a < b) return true;
    if (a > b) return false;
  }

  return false;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes"].includes(normalized)) return true;
  if (["false", "0", "no"].includes(normalized)) return false;
  return fallback;
}

function readEntry(
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

async function fetchRemoteConfigEntries(): Promise<RemoteConfigEntries> {
  const { projectId, apiKey, appId } = getFirebaseProjectConfig();
  const appInstanceId = await getAppInstanceId();
  const currentVersion = getCurrentAppVersion();

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
      "[ForceUpdate] Remote Config template not published yet — using defaults",
    );
    return {};
  }

  return data.entries || {};
}

export async function fetchForceUpdateConfig(): Promise<ForceUpdateConfig> {
  const currentVersion = getCurrentAppVersion();
  const entries = await fetchRemoteConfigEntries();

  const forceUpdateAndroid = parseBoolean(
    readEntry(entries, FORCE_UPDATE_RC_KEYS.forceUpdateAndroid),
    DEFAULTS.forceUpdateAndroid,
  );
  const forceUpdateIos = parseBoolean(
    readEntry(entries, FORCE_UPDATE_RC_KEYS.forceUpdateIos),
    DEFAULTS.forceUpdateIos,
  );
  const forceUpdate =
    Platform.OS === "ios" ? forceUpdateIos : forceUpdateAndroid;
  const minVersionAndroid =
    readEntry(entries, FORCE_UPDATE_RC_KEYS.minVersionAndroid)?.trim() ||
    DEFAULTS.minVersionAndroid;
  const minVersionIos =
    readEntry(entries, FORCE_UPDATE_RC_KEYS.minVersionIos)?.trim() ||
    DEFAULTS.minVersionIos;
  const minVersion =
    Platform.OS === "ios" ? minVersionIos : minVersionAndroid;
  const message =
    readEntry(entries, FORCE_UPDATE_RC_KEYS.message)?.trim() ||
    DEFAULTS.message;
  const androidStoreUrl =
    readEntry(entries, FORCE_UPDATE_RC_KEYS.androidStoreUrl)?.trim() ||
    DEFAULTS.androidStoreUrl;
  const iosStoreUrl =
    readEntry(entries, FORCE_UPDATE_RC_KEYS.iosStoreUrl)?.trim() ||
    DEFAULTS.iosStoreUrl;
  const storeUrl = Platform.OS === "ios" ? iosStoreUrl : androidStoreUrl;
  const willForceUpdate =
    forceUpdate && isVersionBelowMinimum(currentVersion, minVersion);

  Logger.log("[ForceUpdate] Remote Config (all):", {
    force_update_android: forceUpdateAndroid,
    force_update_ios: forceUpdateIos,
    min_version_android: minVersionAndroid,
    min_version_ios: minVersionIos,
    android_store_url: androidStoreUrl,
    ios_store_url: iosStoreUrl,
    force_update_message: message,
  });

  Logger.log("[ForceUpdate] Active for this device:", {
    platform: Platform.OS,
    ...getVersionDebugInfo(),
    force_update: forceUpdate,
    min_version: minVersion,
    store_url: storeUrl,
    willShowForceUpdateScreen: willForceUpdate,
  });

  return {
    forceUpdate,
    minVersion,
    message,
    storeUrl,
    currentVersion,
  };
}

export function shouldForceUpdate(config: ForceUpdateConfig): boolean {
  if (!config.forceUpdate) return false;
  if (!config.minVersion) return false;
  return isVersionBelowMinimum(config.currentVersion, config.minVersion);
}
