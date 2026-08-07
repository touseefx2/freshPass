import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirebaseProjectConfig } from "@/src/config/firebaseNative";
import Logger from "@/src/services/logger";

const INSTANCE_ID_KEY = "@freshpass/firebase_rc_instance_id";
const STRIPE_KEY_CACHE = "@freshpass/stripe_publishable_key";

/** Firebase Remote Config parameter keys shared across features */
export const REMOTE_CONFIG_KEYS = {
  stripePublishableKey: "stripe_publishable_key",
} as const;

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

/**
 * Resolves Stripe publishable key from Firebase Remote Config
 * `stripe_publishable_key`, with AsyncStorage cache for offline/startup.
 *
 * Publishable keys are safe in Remote Config — switch test/live in Console
 * without rebuilding. Backend secret key must still match the same mode.
 */
export async function resolveStripePublishableKey(): Promise<string> {
  const describeKey = (key: string, source: string) => ({
    source,
    mode: key.startsWith("pk_live_")
      ? "live"
      : key.startsWith("pk_test_")
        ? "test"
        : "unknown",
    key,
    length: key.length,
  });

  try {
    const cached = (await AsyncStorage.getItem(STRIPE_KEY_CACHE))?.trim();
    Logger.log("[Stripe] Fetching publishable key from Remote Config...");
    const entries = await fetchRemoteConfigEntries();
    const fromRemote = readRemoteConfigEntry(
      entries,
      REMOTE_CONFIG_KEYS.stripePublishableKey,
    )?.trim();

    Logger.log("[Stripe] Remote Config raw stripe_publishable_key:", {
      present: Boolean(fromRemote),
      value: fromRemote || null,
      cached: cached || null,
    });

    if (fromRemote) {
      if (fromRemote !== cached) {
        await AsyncStorage.setItem(STRIPE_KEY_CACHE, fromRemote);
      }
      Logger.log(
        "[Stripe] ✅ Using key from Remote Config",
        describeKey(fromRemote, "remote_config"),
      );
      return fromRemote;
    }

    if (cached) {
      Logger.log(
        "[Stripe] ⚠️ RC empty — using cached key",
        describeKey(cached, "cache"),
      );
      return cached;
    }
  } catch (error) {
    Logger.warn("[Stripe] Remote Config key fetch failed:", error);
    try {
      const cached = (await AsyncStorage.getItem(STRIPE_KEY_CACHE))?.trim();
      if (cached) {
        Logger.log(
          "[Stripe] ⚠️ Fetch failed — using cached key",
          describeKey(cached, "cache_after_error"),
        );
        return cached;
      }
    } catch {
      // ignore cache read errors
    }
  }

  Logger.warn("[Stripe] ❌ No publishable key from Remote Config or cache");
  return "";
}
