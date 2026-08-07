import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import {
  fetchRemoteConfigEntries,
  readRemoteConfigEntry,
} from "@/src/services/remoteConfigService";
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

export type ForceUpdateConfig = {
  forceUpdate: boolean;
  minVersion: string;
  message: string;
  storeUrl: string;
  currentVersion: string;
};

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

export async function fetchForceUpdateConfig(): Promise<ForceUpdateConfig> {
  const currentVersion = getCurrentAppVersion();
  const entries = await fetchRemoteConfigEntries();

  const forceUpdateAndroid = parseBoolean(
    readRemoteConfigEntry(entries, FORCE_UPDATE_RC_KEYS.forceUpdateAndroid),
    DEFAULTS.forceUpdateAndroid,
  );
  const forceUpdateIos = parseBoolean(
    readRemoteConfigEntry(entries, FORCE_UPDATE_RC_KEYS.forceUpdateIos),
    DEFAULTS.forceUpdateIos,
  );
  const forceUpdate =
    Platform.OS === "ios" ? forceUpdateIos : forceUpdateAndroid;
  const minVersionAndroid =
    readRemoteConfigEntry(
      entries,
      FORCE_UPDATE_RC_KEYS.minVersionAndroid,
    )?.trim() || DEFAULTS.minVersionAndroid;
  const minVersionIos =
    readRemoteConfigEntry(
      entries,
      FORCE_UPDATE_RC_KEYS.minVersionIos,
    )?.trim() || DEFAULTS.minVersionIos;
  const minVersion =
    Platform.OS === "ios" ? minVersionIos : minVersionAndroid;
  const message =
    readRemoteConfigEntry(entries, FORCE_UPDATE_RC_KEYS.message)?.trim() ||
    DEFAULTS.message;
  const androidStoreUrl =
    readRemoteConfigEntry(
      entries,
      FORCE_UPDATE_RC_KEYS.androidStoreUrl,
    )?.trim() || DEFAULTS.androidStoreUrl;
  const iosStoreUrl =
    readRemoteConfigEntry(
      entries,
      FORCE_UPDATE_RC_KEYS.iosStoreUrl,
    )?.trim() || DEFAULTS.iosStoreUrl;
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
