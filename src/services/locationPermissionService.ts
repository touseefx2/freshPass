import * as Location from "expo-location";
import { Platform, Alert, Linking } from "react-native";
import Logger from "./logger";

export interface LocationPermissionResult {
  granted: boolean;
  canRequestAgain: boolean;
  message: string;
  servicesEnabled: boolean; // Whether location services are enabled on the device
}

export interface HandleLocationPermissionResult {
  granted: boolean;
  errorMessage?: string; // Error message to display as red text (if any)
  shouldOpenSettings?: boolean; // Whether to open settings
}

/**
 * Request location permission with proper handling for iOS and Android
 * Returns whether permission was granted and if user can request again
 * NOTE: This function assumes location services are already enabled
 */
export const requestLocationPermission =
  async (): Promise<LocationPermissionResult> => {
    try {
      // Step 1: Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      
      // If location services are OFF, don't request permission yet
      // User needs to enable location services first
      if (!servicesEnabled) {
        return {
          granted: false,
          canRequestAgain: true,
          servicesEnabled: false,
          message:
            "Location services are turned off. Please enable location services in your device settings.",
        };
      }

      // Step 2: Request permission (location services are ON)
      const permissionResponse =
        await Location.requestForegroundPermissionsAsync();

      const { status: requestedStatus } = permissionResponse;

      // Step 3: Handle different permission states
      if (requestedStatus === Location.PermissionStatus.GRANTED) {
        // Permission granted - return success (even if location services are off, permission is granted)
        return {
          granted: true,
          canRequestAgain: false,
          servicesEnabled: servicesEnabled,
          message: "",
        };
      }

      // Step 4: Check if permission is permanently blocked
      // Android: has canAskAgain property
      // iOS: doesn't have canAskAgain, but we can detect if permanently blocked
      let canAskAgain = true;

      if (Platform.OS === "android") {
        // Android: Check canAskAgain property if available
        canAskAgain =
          "canAskAgain" in permissionResponse
            ? (permissionResponse as any).canAskAgain
            : true;
      } else {
        // iOS: If status is DENIED, user can still request again
        // Permanently blocked only if user disabled in settings (UNDETERMINED after blocking)
        // For now, treat DENIED as can request again on iOS
        canAskAgain =
          requestedStatus === Location.PermissionStatus.DENIED ||
          requestedStatus === Location.PermissionStatus.UNDETERMINED;
      }

      // Step 5: Return appropriate response
      if (canAskAgain) {
        // First time deny: can request again
        // Don't show alert if it's first-time deny (silent deny)
        // But if location services are off, we still want to inform user
        return {
          granted: false,
          canRequestAgain: true,
          servicesEnabled: servicesEnabled,
          message:
            "Location permission is required to use your current location.",
        };
      }

      // Permanently blocked: can't request again, show alert with settings option
      return {
        granted: false,
        canRequestAgain: false,
        servicesEnabled: servicesEnabled,
        message:
          "Location permission was denied. Please enable location access in your device settings.",
      };
    } catch (error) {
      Logger.error("Error requesting location permission:", error);
      return {
        granted: false,
        canRequestAgain: true,
        servicesEnabled: true, // Assume enabled if we can't check due to error
        message: "Unable to request location permission. Please try again.",
      };
    }
  };

/**
 * Show alert with option to open device settings
 */
export const showLocationPermissionAlert = (
  message: string,
  onOpenSettings: () => void
) => {
  Alert.alert(
    "Location Permission Required",
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
 * Open location settings directly (iOS or Android)
 * Android: Opens native location settings page directly using Intent
 * iOS: Opens app settings where user can enable location permissions
 * NOTE: Location services still need to be manually enabled by user (platform restriction)
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === "ios") {
      // iOS: Open app settings where user can enable location permissions
      await Linking.openURL("app-settings:");
    } else {
      // Android: Open location settings page DIRECTLY using Intent
      // This opens the native Android location ON/OFF settings screen
      await Linking.openURL("android.settings.LOCATION_SOURCE_SETTINGS");
    }
  } catch (error) {
    Logger.error("Error opening location settings:", error);
    // Fallback: Try opening general settings if location settings intent fails
    try {
      if (Platform.OS === "android") {
        await Linking.openSettings();
      } else {
        await Linking.openURL("app-settings:");
      }
    } catch (fallbackError) {
      Logger.error("Error opening fallback settings:", fallbackError);
      Alert.alert(
        "Unable to open settings",
        "Please manually enable location services in your device settings:\n\n• Android: Settings > Location\n• iOS: Settings > Privacy & Security > Location Services"
      );
    }
  }
};

/**
 * Complete location permission flow
 * Flow:
 * 1. First check if location services are ON (if OFF, return error message - NO ALERT)
 * 2. Then request location permission (if denied, handle accordingly)
 * Returns result object with granted status and optional error message
 * Error message will be displayed as red text in the UI (not as alert popup)
 */
export const handleLocationPermission = async (): Promise<HandleLocationPermissionResult> => {
  // Step 1: First check if location services are enabled
  // This is the FIRST step - user must enable location services before permission can work
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  
  if (!servicesEnabled) {
    // Location services are OFF - return error message (no alert, display as red text)
    // User needs to enable location services manually in device settings
    // This will be shown as red text in the UI (no alert popup)
    return {
      granted: false,
      errorMessage: "Please enable location services on your phone first",
      shouldOpenSettings: false,
    };
  }

  // Step 2: Location services are ON - now request permission
  const result = await requestLocationPermission();


  // Permission granted - location services are already ON (checked above)
  if (result.granted) {
    return { granted: true }; // Everything is good - permission granted and services ON
  }

  // Permission denied - handle different scenarios:
  
  // Scenario 1: Permission is permanently blocked (can't request again)
  // Show alert dialog with "Open Settings" option (not red text)
  if (!result.canRequestAgain) {
    showLocationPermissionAlert(
      "Your location permission has been denied. Please enable location access in your device settings.",
      async () => {
        await openLocationSettings();
      }
    );
    return { granted: false }; // No errorMessage - alert already shown
  }

  // Scenario 2: First-time deny (can request again, location services are on)
  // Return silently - no error message, no alert (user can try again later)
  // This is normal behavior - user might deny first time but allow later
  return { granted: false };
};
