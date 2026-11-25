import * as Location from "expo-location";
import { Platform, Alert, Linking } from "react-native";
import Logger from "./logger";
import i18n from "i18next";

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

// i18n keys, translated when used
const PERMISSION_DENIED_MESSAGE_KEY = "locationScreenPermissionRequired";
const PERMISSION_SETTINGS_MESSAGE_KEY = "locPermSvcDeniedSettings";
const SERVICES_DISABLED_MESSAGE_KEY = "locPermSvcServicesOffFirst";

/**
 * Android: shows Google's in-app "Turn on device location" popup (like Uber /
 * Careem) so the user can switch phone location on with one tap.
 * iOS has no such API, so it only reports the current state there.
 * Returns true when location services are on afterwards.
 */
export const ensureLocationServicesOn = async (): Promise<boolean> => {
  try {
    if (await Location.hasServicesEnabledAsync()) return true;
    if (Platform.OS !== "android") return false;
    // Rejects if the user taps "No thanks" in the system popup
    await Location.enableNetworkProviderAsync();
    return await Location.hasServicesEnabledAsync();
  } catch (error) {
    Logger.warn("Location services not turned on:", error);
    return false;
  }
};

/**
 * Request location permission with proper handling for iOS and Android
 * Returns whether permission was granted and if user can request again
 * NOTE: This function assumes location services are already enabled
 */
export const requestLocationPermission =
  async (): Promise<LocationPermissionResult> => {
    try {
      // Step 1: Check if location services are enabled (Android: offer the system popup)
      const servicesEnabled = await ensureLocationServicesOn();
      
      // If location services are OFF, don't request permission yet
      // User needs to enable location services first
      if (!servicesEnabled) {
        return {
          granted: false,
          canRequestAgain: true,
          servicesEnabled: false,
          message: i18n.t("locPermSvcServicesOff"),
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
          message: i18n.t(PERMISSION_DENIED_MESSAGE_KEY),
        };
      }

      // Permanently blocked: can't request again, show alert with settings option
      return {
        granted: false,
        canRequestAgain: false,
        servicesEnabled: servicesEnabled,
        message: i18n.t(PERMISSION_SETTINGS_MESSAGE_KEY),
      };
    } catch (error) {
      Logger.error("Error requesting location permission:", error);
      return {
        granted: false,
        canRequestAgain: true,
        servicesEnabled: true, // Assume enabled if we can't check due to error
        message: i18n.t("locPermSvcRequestFailed"),
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
    i18n.t("locPermSvcAlertTitle"),
    message,
    [
      {
        text: i18n.t("cancel"),
        style: "cancel",
      },
      {
        text: i18n.t("locPermSvcOpenSettings"),
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
      // Apple's official link — opens FreshPass's own page (Location row on top).
      // Custom app-settings:root=… links land on the Settings home on new iOS.
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
        i18n.t("locPermSvcOpenSettingsFailedTitle"),
        i18n.t("locPermSvcOpenSettingsFailedMsg"),
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
  const servicesEnabled = await ensureLocationServicesOn();

  if (!servicesEnabled) {
    return {
      granted: false,
      errorMessage: i18n.t(SERVICES_DISABLED_MESSAGE_KEY),
      shouldOpenSettings: true,
    };
  }

  const existing = await Location.getForegroundPermissionsAsync();

  if (existing.status === Location.PermissionStatus.GRANTED) {
    return { granted: true };
  }

  // iOS never shows its dialog again after "Don't Allow" — straight to Settings.
  if (
    Platform.OS === "ios" &&
    existing.status === Location.PermissionStatus.DENIED
  ) {
    showLocationPermissionAlert(
      i18n.t("locPermSvcAccessOffIos"),
      () => {
        void openLocationSettings();
      },
    );
    return {
      granted: false,
      errorMessage: i18n.t("locPermSvcRequiredSettings"),
    };
  }

  // Android: canAskAgain can be stale (e.g. "remove permissions if app is
  // unused" reset them), so always really ask. If Android answers instantly,
  // it showed no dialog → the permission is blocked → offer Settings.
  const wasBlocked =
    Platform.OS === "android" && existing.canAskAgain === false;
  const askedAt = Date.now();
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
    const noDialogShown = wasBlocked && Date.now() - askedAt < 600;
    if (noDialogShown) {
      showLocationPermissionAlert(i18n.t(PERMISSION_SETTINGS_MESSAGE_KEY), () => {
        void openLocationSettings();
      });
    }
    // Otherwise the user just tapped "Don't allow" — respect it, no alert.
    return {
      granted: false,
      errorMessage: i18n.t(PERMISSION_SETTINGS_MESSAGE_KEY),
    };
  }

  return {
    granted: false,
    errorMessage: result.message || i18n.t(PERMISSION_DENIED_MESSAGE_KEY),
  };
};
