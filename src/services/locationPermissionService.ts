import * as Location from "expo-location";
import Constants from "expo-constants";
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

const PERMISSION_DENIED_MESSAGE =
  "Location permission is required to use your current location.";
const PERMISSION_SETTINGS_MESSAGE =
  "Location permission was denied. Please enable location access in your device settings.";
const SERVICES_DISABLED_MESSAGE =
  "Please enable location services on your phone first";

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
        // iOS: after the user taps Don't Allow, the system will not show the dialog again
        canAskAgain = requestedStatus !== Location.PermissionStatus.DENIED;
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
 * iOS: Opens Fresh Pass app settings (Location permission row)
 */
export const openLocationSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === "ios") {
      const bundleId =
        Constants.expoConfig?.ios?.bundleIdentifier ?? "com.freshpass";

      const iosDeepLinks = [
        `app-settings:root=LOCATION&path=${bundleId}`,
        `app-settings:root=${bundleId}`,
      ];

      for (const url of iosDeepLinks) {
        try {
          await Linking.openURL(url);
          return;
        } catch {
          // Try next deep link
        }
      }

      await Linking.openSettings();
      return;
    }

    // Android: Open location settings page directly
    await Linking.openURL("android.settings.LOCATION_SOURCE_SETTINGS");
  } catch (error) {
    Logger.error("Error opening location settings:", error);
    try {
      if (Platform.OS === "android") {
        await Linking.openSettings();
      } else {
        await Linking.openSettings();
      }
    } catch (fallbackError) {
      Logger.error("Error opening fallback settings:", fallbackError);
      Alert.alert(
        "Unable to open settings",
        "Please manually enable location for Fresh Pass:\n\nSettings → Fresh Pass → Location → While Using the App",
      );
    }
  }
};

/**
 * Complete location permission flow
 * Flow:
 * 1. First check if location services are ON (if OFF, return error message)
 * 2. Check existing permission — iOS won't re-prompt after Don't Allow
 * 3. Request permission when the system may still show a dialog
 * Returns result object with granted status and optional error message
 */
export const handleLocationPermission = async (): Promise<HandleLocationPermissionResult> => {
  const servicesEnabled = await Location.hasServicesEnabledAsync();

  if (!servicesEnabled) {
    return {
      granted: false,
      errorMessage: SERVICES_DISABLED_MESSAGE,
      shouldOpenSettings: true,
    };
  }

  const existing = await Location.getForegroundPermissionsAsync();

  if (existing.status === Location.PermissionStatus.GRANTED) {
    return { granted: true };
  }

  const isIosDenied =
    Platform.OS === "ios" &&
    existing.status === Location.PermissionStatus.DENIED;

  const isAndroidPermanentlyDenied =
    Platform.OS === "android" &&
    existing.status === Location.PermissionStatus.DENIED &&
    existing.canAskAgain === false;

  if (isIosDenied || isAndroidPermanentlyDenied) {
    const alertMessage = isIosDenied
      ? "Location access is turned off. Enable it in Settings to use your current location."
      : PERMISSION_SETTINGS_MESSAGE;

    showLocationPermissionAlert(alertMessage, () => {
      void openLocationSettings();
    });

    return {
      granted: false,
      errorMessage: isIosDenied
        ? "Location permission is required. Please enable it in Settings."
        : PERMISSION_SETTINGS_MESSAGE,
    };
  }

  const result = await requestLocationPermission();

  if (result.granted) {
    return { granted: true };
  }

  if (!result.servicesEnabled) {
    return {
      granted: false,
      errorMessage: result.message,
      shouldOpenSettings: true,
    };
  }

  if (!result.canRequestAgain) {
    showLocationPermissionAlert(PERMISSION_SETTINGS_MESSAGE, () => {
      void openLocationSettings();
    });

    return {
      granted: false,
      errorMessage: PERMISSION_SETTINGS_MESSAGE,
    };
  }

  return {
    granted: false,
    errorMessage: result.message || PERMISSION_DENIED_MESSAGE,
  };
};
