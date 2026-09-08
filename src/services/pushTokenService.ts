import { ApiService, checkInternetConnection } from "@/src/services/api";
import { userEndpoints } from "@/src/services/endpoints";
import { getExpoPushToken } from "@/src/services/notificationPermissionService";
import { LocalStorageService } from "@/src/services/storage";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";

const LAST_SENT_EXPO_PUSH_TOKEN_KEY = "last_sent_expo_push_token";

let syncInFlight: Promise<void> | null = null;

/**
 * Register / refresh the device Expo push token with the backend.
 * Call on every app start when signed in, after notification permission is
 * granted, and whenever Expo returns a token different from the last one sent.
 * Safe to call repeatedly with the same value.
 */
export async function syncExpoPushTokenToBackend(
  options?: { force?: boolean },
): Promise<void> {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    try {
      const { accessToken, isGuest } = store.getState().user;
      if (!accessToken || isGuest) {
        return;
      }

      const token = await getExpoPushToken();
      if (!token) {
        return;
      }

      if (!options?.force) {
        const lastSent = await LocalStorageService.getItem(
          LAST_SENT_EXPO_PUSH_TOKEN_KEY,
        );
        if (lastSent === token) {
          return;
        }
      }

      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        return;
      }

      await ApiService.post(userEndpoints.pushToken, {
        expo_push_token: token,
      });
      await LocalStorageService.setItem(LAST_SENT_EXPO_PUSH_TOKEN_KEY, token);
      Logger.log("Expo push token synced to backend");
    } catch (error) {
      Logger.error("Failed to sync Expo push token:", error);
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}

/**
 * Clear the push token on the backend without logging out
 * (e.g. in-app "turn off push notifications").
 */
export async function clearExpoPushTokenOnBackend(): Promise<boolean> {
  try {
    const { accessToken, isGuest } = store.getState().user;
    if (!accessToken || isGuest) {
      return false;
    }

    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      return false;
    }

    await ApiService.delete(userEndpoints.pushToken);
    await LocalStorageService.removeItem(LAST_SENT_EXPO_PUSH_TOKEN_KEY);
    Logger.log("Expo push token cleared on backend");
    return true;
  } catch (error) {
    Logger.error("Failed to clear Expo push token:", error);
    return false;
  }
}

/** Drop local cache so the next signed-in session re-registers the token. */
export async function clearLastSentExpoPushToken(): Promise<void> {
  try {
    await LocalStorageService.removeItem(LAST_SENT_EXPO_PUSH_TOKEN_KEY);
  } catch (error) {
    Logger.error("Failed to clear last sent Expo push token:", error);
  }
}
