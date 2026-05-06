import * as Notifications from "expo-notifications";
import { Platform, Alert, Linking } from "react-native";
import Constants from "expo-constants";
import Logger from "./logger";

/**
 * Get Expo push token for sending to backend (e.g. on login).
 * Returns token string or null if permission denied / unavailable.
 * On Android, FCM must be configured (see https://docs.expo.dev/push-notifications/fcm-credentials/);
 * if not, this returns null and login continues without the token.
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return null;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResult = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResult?.data ?? null;
    if (token) {
      Logger.log("Expo push token obtained");
    }
    return token;
  } catch (error: any) {
    const message = error?.message ?? String(error);
    const isFcmNotSetup =
      Platform.OS === "android" &&
      (message.includes("FirebaseApp") ||
        message.includes("FCM") ||
        message.includes("fcm-credentials"));
    if (isFcmNotSetup) {
      Logger.log(
        "Push token skipped: configure FCM for Android (see expo.dev/push-notifications/fcm-credentials)",
      );
    } else {
      Logger.error("Error getting Expo push token:", error);
    }
    return null;
  }
};

export interface NotificationPermissionResult {
  granted: boolean;
  canRequestAgain: boolean;
  message: string;
}

/**
 * Request notification permission with proper handling for iOS and Android
 * Returns whether permission was granted and if user can request again
 */
export const requestNotificationPermission =
  async (): Promise<NotificationPermissionResult> => {
    try {
      // Step 1: Check existing permission status
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();

      // Step 2: If already granted, return success
      if (existingStatus === "granted") {
        return {
          granted: true,
          canRequestAgain: false,
          message: "",
        };
      }

      // Step 3: Request permission
      const { status: requestedStatus } =
        await Notifications.requestPermissionsAsync();

      // Step 4: Handle different permission states
      if (requestedStatus === "granted") {
        // Set up notification channel for Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }

        // Get push token (optional, for sending push notifications from server)
        try {
          const token = await Notifications.getExpoPushTokenAsync();
          Logger.log("Push token:", token);
        } catch (error) {
          Logger.log("Could not get push token:", error);
        }

        return {
          granted: true,
          canRequestAgain: false,
          message: "",
        };
      }

      // Step 5: Check if permission is permanently blocked
      let canAskAgain = true;

      if (Platform.OS === "android") {
        // Android: Check if permission is denied
        // If status is denied, we need to check if it's permanently denied
        // On Android, if user denies twice, it becomes permanently denied
        // We can detect this by checking if status is "denied" after request
        // For now, if status is "denied", assume it might be blocked
        // In practice, Android shows the system dialog only once, then blocks
        canAskAgain = requestedStatus === "undetermined";
      } else {
        // iOS: If status is DENIED, user can still request again
        // Permanently blocked only if user disabled in settings
        // On iOS, "denied" means user can still request again
        // Only truly blocked if user goes to settings and disables
        canAskAgain =
          requestedStatus === "denied" || requestedStatus === "undetermined";
      }

      // Step 6: Return appropriate response
      if (canAskAgain) {
        // First time deny: can request again, don't show alert
        return {
          granted: false,
          canRequestAgain: true,
          message:
            "Notification permission is required to receive booking alerts.",
        };
      }

      // Permanently blocked: can't request again, show alert with settings option
      return {
        granted: false,
        canRequestAgain: false,
        message:
          "Notification permission was denied. Please enable notifications in your device settings to receive booking alerts.",
      };
    } catch (error) {
      Logger.error("Error requesting notification permission:", error);
      return {
        granted: false,
        canRequestAgain: true,
        message: "Unable to request notification permission. Please try again.",
      };
    }
  };

/**
 * Show alert with option to open device settings
 */
export const showNotificationPermissionAlert = (
  message: string,
  onOpenSettings: () => void,
) => {
  Alert.alert(
    "Notification Permission Required",
    message,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Open Settings",
        onPress: onOpenSettings,
      },
    ],
    { cancelable: true },
  );
};

/**
 * Open device settings (iOS or Android)
 * Android: Opens app notification settings directly (API 26+), not just App info.
 * iOS: Opens app's Notification settings screen directly (Allow Notifications, Banners, etc.).
 */
export const openNotificationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === "ios") {
      const bundleId =
        Constants.expoConfig?.ios?.bundleIdentifier ?? "com.freshpass";
      const notificationSettingsURL = `app-settings:root=NOTIFICATIONS&path=${bundleId}`;

      try {
        await Linking.openURL(notificationSettingsURL);
        return;
      } catch {
        // Deep link not supported or blocked; fallback to app settings page
        console.log(
          "Deep link not supported or blocked; fallback to app settings page",
        );
        await Linking.openSettings();
      }
    } else {
      // Android: open notification settings directly (skips App info screen)
      const apiLevel = Platform.Version as number;
      const packageName =
        Constants.expoConfig?.android?.package ?? "com.freshpass";
      if (apiLevel >= 26 && "sendIntent" in Linking) {
        try {
          await (Linking as any).sendIntent(
            "android.settings.APP_NOTIFICATION_SETTINGS",
            [
              {
                key: "android.provider.extra.APP_PACKAGE",
                value: packageName,
              },
            ],
          );
          return;
        } catch {
          // Fallback to app settings if intent fails
        }
      }
      await Linking.openSettings();
    }
  } catch (error) {
    Logger.error("Error opening settings:", error);
    Alert.alert(
      "Unable to open settings",
      "Please manually enable notification permissions in your device settings.",
    );
  }
};

/**
 * Complete notification permission flow with alert handling
 * Returns true if permission granted, false otherwise
 */
export const handleNotificationPermission = async (): Promise<boolean> => {
  const result = await requestNotificationPermission();

  if (result.granted) {
    return true;
  }

  // Only show alert if permission is permanently blocked (can't request again)
  // First time deny: canRequestAgain = true, don't show alert (silent deny)
  // Second time deny (blocked): canRequestAgain = false, show alert with settings option
  if (!result.canRequestAgain) {
    showNotificationPermissionAlert(result.message, async () => {
      await openNotificationSettings();
    });
  }

  return false;
};

/**
 * Require notification permission before auth actions (login/signup/social).
 * Blocks auth flow until notifications are enabled.
 */
export const ensureNotificationPermissionForAuth =
  async (): Promise<boolean> => {
    const result = await requestNotificationPermission();

    if (result.granted) {
      return true;
    }

    const authRequiredMessage =
      "Notifications must be enabled to continue with login or signup. You can turn them off later from app settings.";

    showNotificationPermissionAlert(authRequiredMessage, async () => {
      await openNotificationSettings();
    });

    return false;
  };
