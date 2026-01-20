import * as Notifications from "expo-notifications";
import { Platform, Alert, Linking } from "react-native";

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
          console.log("Push token:", token);
        } catch (error) {
          console.log("Could not get push token:", error);
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
      console.error("Error requesting notification permission:", error);
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
  onOpenSettings: () => void
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
    { cancelable: true }
  );
};

/**
 * Open device settings (iOS or Android)
 */
export const openNotificationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === "ios") {
      // iOS: Open app settings
      await Linking.openURL("app-settings:");
    } else {
      // Android: Open app settings
      await Linking.openSettings();
    }
  } catch (error) {
    console.error("Error opening settings:", error);
    Alert.alert(
      "Unable to open settings",
      "Please manually enable notification permissions in your device settings."
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

