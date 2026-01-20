import * as ImagePicker from "expo-image-picker";
import { Platform, Alert, Linking } from "react-native";

export interface MediaPermissionResult {
  granted: boolean;
  canRequestAgain: boolean;
  message: string;
}

/**
 * Request media library permission with proper handling for iOS and Android
 * Returns whether permission was granted and if user can request again
 */
export const requestMediaLibraryPermission =
  async (): Promise<MediaPermissionResult> => {
    try {
      // Request permission (this also returns current status if already granted)
      const permissionResponse =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      const { status: requestedStatus } = permissionResponse;

      // Handle different permission states
      if (requestedStatus === ImagePicker.PermissionStatus.GRANTED) {
        return {
          granted: true,
          canRequestAgain: false,
          message: "",
        };
      }

      // Check if permission is permanently blocked
      let canAskAgain = true;

      if (Platform.OS === "android") {
        // Android: Check canAskAgain property if available
        canAskAgain =
          "canAskAgain" in permissionResponse
            ? (permissionResponse as any).canAskAgain
            : true;
      } else {
        // iOS: If status is DENIED, user can still request again
        // Permanently blocked only if user disabled in settings
        canAskAgain =
          requestedStatus === ImagePicker.PermissionStatus.DENIED ||
          requestedStatus === ImagePicker.PermissionStatus.UNDETERMINED;
      }

      // Return appropriate response
      if (canAskAgain) {
        // First time deny: can request again, don't show alert
        return {
          granted: false,
          canRequestAgain: true,
          message: "Media library permission is required to select photos.",
        };
      }

      // Permanently blocked: can't request again, show alert with settings option
      return {
        granted: false,
        canRequestAgain: false,
        message:
          "Media library permission was denied. Please enable photo access in your device settings.",
      };
    } catch (error) {
      console.error("Error requesting media library permission:", error);
      return {
        granted: false,
        canRequestAgain: true,
        message: "Unable to request media library permission. Please try again.",
      };
    }
  };

/**
 * Request camera permission with proper handling for iOS and Android
 * Returns whether permission was granted and if user can request again
 */
export const requestCameraPermission =
  async (): Promise<MediaPermissionResult> => {
    try {
      // Request permission (this also returns current status if already granted)
      const permissionResponse =
        await ImagePicker.requestCameraPermissionsAsync();

      const { status: requestedStatus } = permissionResponse;

      // Handle different permission states
      if (requestedStatus === ImagePicker.PermissionStatus.GRANTED) {
        return {
          granted: true,
          canRequestAgain: false,
          message: "",
        };
      }

      // Check if permission is permanently blocked
      let canAskAgain = true;

      if (Platform.OS === "android") {
        // Android: Check canAskAgain property if available
        canAskAgain =
          "canAskAgain" in permissionResponse
            ? (permissionResponse as any).canAskAgain
            : true;
      } else {
        // iOS: If status is DENIED, user can still request again
        // Permanently blocked only if user disabled in settings
        canAskAgain =
          requestedStatus === ImagePicker.PermissionStatus.DENIED ||
          requestedStatus === ImagePicker.PermissionStatus.UNDETERMINED;
      }

      // Return appropriate response
      if (canAskAgain) {
        // First time deny: can request again, don't show alert
        return {
          granted: false,
          canRequestAgain: true,
          message: "Camera permission is required to take photos.",
        };
      }

      // Permanently blocked: can't request again, show alert with settings option
      return {
        granted: false,
        canRequestAgain: false,
        message:
          "Camera permission was denied. Please enable camera access in your device settings.",
      };
    } catch (error) {
      console.error("Error requesting camera permission:", error);
      return {
        granted: false,
        canRequestAgain: true,
        message: "Unable to request camera permission. Please try again.",
      };
    }
  };

/**
 * Show alert with option to open device settings
 */
export const showMediaPermissionAlert = (
  message: string,
  onOpenSettings: () => void
) => {
  Alert.alert(
    "Permission Required",
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
export const openMediaSettings = async (): Promise<void> => {
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
      "Please manually enable photo permissions in your device settings."
    );
  }
};

/**
 * Complete media library permission flow with alert handling
 * Returns true if permission granted, false otherwise
 */
export const handleMediaLibraryPermission = async (): Promise<boolean> => {
  const result = await requestMediaLibraryPermission();

  if (result.granted) {
    return true;
  }

  // Only show alert if permission is permanently blocked (can't request again)
  // First time deny: canRequestAgain = true, don't show alert (silent deny)
  // Second time deny (blocked): canRequestAgain = false, show alert with settings option
  if (!result.canRequestAgain) {
    showMediaPermissionAlert(result.message, async () => {
      await openMediaSettings();
    });
  }

  return false;
};

/**
 * Complete camera permission flow with alert handling
 * Returns true if permission granted, false otherwise
 */
export const handleCameraPermission = async (): Promise<boolean> => {
  const result = await requestCameraPermission();

  if (result.granted) {
    return true;
  }

  // Only show alert if permission is permanently blocked (can't request again)
  // First time deny: canRequestAgain = true, don't show alert (silent deny)
  // Second time deny (blocked): canRequestAgain = false, show alert with settings option
  if (!result.canRequestAgain) {
    showMediaPermissionAlert(result.message, async () => {
      await openMediaSettings();
    });
  }

  return false;
};

