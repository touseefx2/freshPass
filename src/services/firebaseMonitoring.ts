import { Platform } from "react-native";
import {
  getCrashlytics,
  log as crashlyticsLog,
  recordError,
  setAttribute,
  setAttributes,
  setCrashlyticsCollectionEnabled,
  setUserId as setCrashlyticsUserId,
} from "@react-native-firebase/crashlytics";
import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setUserId as setAnalyticsUserId,
  setUserProperty,
} from "@react-native-firebase/analytics";
import Logger from "@/src/services/logger";

const isNativeMobile = Platform.OS === "ios" || Platform.OS === "android";

function canUseNativeFirebase(): boolean {
  return isNativeMobile;
}

/**
 * Enable Crashlytics + Analytics collection on native iOS/Android.
 * Safe to call on web — no-ops there.
 */
export async function initFirebaseMonitoring(): Promise<void> {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    const crashlytics = getCrashlytics();
    const analytics = getAnalytics();

    await Promise.all([
      setCrashlyticsCollectionEnabled(crashlytics, true),
      setAnalyticsCollectionEnabled(analytics, true),
    ]);
  } catch (error) {
    Logger.warn("[FirebaseMonitoring] Init failed:", error);
  }
}

/**
 * Tie Crashlytics + Analytics sessions to the logged-in user.
 * Pass null/undefined on logout to clear.
 */
export async function setFirebaseUser(params: {
  userId?: number | string | null;
  role?: string | null;
}): Promise<void> {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    const crashlytics = getCrashlytics();
    const analytics = getAnalytics();
    const userId =
      params.userId === null || params.userId === undefined
        ? null
        : String(params.userId);

    await Promise.all([
      setCrashlyticsUserId(crashlytics, userId ?? ""),
      setAnalyticsUserId(analytics, userId),
      params.role
        ? setAttribute(crashlytics, "user_role", params.role)
        : Promise.resolve(null),
      params.role
        ? setUserProperty(analytics, "user_role", params.role)
        : setUserProperty(analytics, "user_role", null),
    ]);
  } catch (error) {
    Logger.warn("[FirebaseMonitoring] setFirebaseUser failed:", error);
  }
}

export async function clearFirebaseUser(): Promise<void> {
  await setFirebaseUser({ userId: null, role: null });
}

/** Breadcrumb for the next crash / non-fatal report */
export function logFirebaseBreadcrumb(message: string): void {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    crashlyticsLog(getCrashlytics(), message);
  } catch (error) {
    Logger.warn("[FirebaseMonitoring] log breadcrumb failed:", error);
  }
}

/** Report a caught JS error as a non-fatal Crashlytics issue */
export function recordFirebaseError(error: unknown, context?: string): void {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    const crashlytics = getCrashlytics();
    if (context) {
      crashlyticsLog(crashlytics, context);
    }

    const normalized =
      error instanceof Error
        ? error
        : new Error(typeof error === "string" ? error : JSON.stringify(error));

    recordError(crashlytics, normalized);
  } catch (err) {
    Logger.warn("[FirebaseMonitoring] recordError failed:", err);
  }
}

export async function setFirebaseAttributes(
  attributes: Record<string, string>
): Promise<void> {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    await setAttributes(getCrashlytics(), attributes);
  } catch (error) {
    Logger.warn("[FirebaseMonitoring] setAttributes failed:", error);
  }
}

/** Custom Analytics event (name: snake_case, max 40 chars) */
export async function logFirebaseEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): Promise<void> {
  if (!canUseNativeFirebase()) {
    return;
  }

  try {
    // Custom event names are supported; cast keeps modular overloads happy.
    await logEvent(
      getAnalytics(),
      name as Parameters<typeof logEvent>[1],
      params as Parameters<typeof logEvent>[2]
    );
  } catch (error) {
    Logger.warn("[FirebaseMonitoring] logEvent failed:", error);
  }
}
