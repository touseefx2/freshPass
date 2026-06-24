import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { Platform, Alert, Linking } from "react-native";
import Logger from "./logger";

export interface MediaPermissionResult {
  granted: boolean;
  canRequestAgain: boolean;
  message: string;
}

type MediaPermissionKind = "library" | "camera";

const GALLERY_DENIED_MESSAGE =
  "Photo library permission is required to select photos.";
const GALLERY_SETTINGS_MESSAGE =
  "Photo library access was denied. Please enable photo access in your device settings.";
const CAMERA_DENIED_MESSAGE = "Camera permission is required to take photos.";
const CAMERA_SETTINGS_MESSAGE =
  "Camera access was denied. Please enable camera access in your device settings.";

const getMessages = (kind: MediaPermissionKind) =>
  kind === "library"
    ? {
        denied: GALLERY_DENIED_MESSAGE,
        settings: GALLERY_SETTINGS_MESSAGE,
        iosAlert:
          "Photo library access is turned off. Enable it in Settings to select photos.",
        iosError:
          "Photo library permission is required. Please enable it in Settings.",
        settingsFallback:
          "Please manually enable Photos for Fresh Pass:\n\nSettings → Fresh Pass → Photos → All Photos",
      }
    : {
        denied: CAMERA_DENIED_MESSAGE,
        settings: CAMERA_SETTINGS_MESSAGE,
        iosAlert:
          "Camera access is turned off. Enable it in Settings to take photos.",
        iosError:
          "Camera permission is required. Please enable it in Settings.",
        settingsFallback:
          "Please manually enable Camera for Fresh Pass:\n\nSettings → Fresh Pass → Camera",
      };

const getExistingPermission = (kind: MediaPermissionKind) =>
  kind === "library"
    ? ImagePicker.getMediaLibraryPermissionsAsync()
    : ImagePicker.getCameraPermissionsAsync();

const requestPermission = (kind: MediaPermissionKind) =>
  kind === "library"
    ? ImagePicker.requestMediaLibraryPermissionsAsync()
    : ImagePicker.requestCameraPermissionsAsync();

/**
 * Request media permission (library or camera) after optional pre-checks.
 */
const requestMediaPermission = async (
  kind: MediaPermissionKind,
): Promise<MediaPermissionResult> => {
  const messages = getMessages(kind);

  try {
    const permissionResponse = await requestPermission(kind);
    const { status: requestedStatus } = permissionResponse;

    if (requestedStatus === ImagePicker.PermissionStatus.GRANTED) {
      return {
        granted: true,
        canRequestAgain: false,
        message: "",
      };
    }

    let canAskAgain = true;

    if (Platform.OS === "android") {
      canAskAgain =
        "canAskAgain" in permissionResponse
          ? (permissionResponse as { canAskAgain?: boolean }).canAskAgain !==
            false
          : true;
    } else {
      // iOS will not show the permission dialog again after Don't Allow
      canAskAgain = requestedStatus !== ImagePicker.PermissionStatus.DENIED;
    }

    if (canAskAgain) {
      return {
        granted: false,
        canRequestAgain: true,
        message: messages.denied,
      };
    }

    return {
      granted: false,
      canRequestAgain: false,
      message: messages.settings,
    };
  } catch (error) {
    Logger.error(`Error requesting ${kind} permission:`, error);
    return {
      granted: false,
      canRequestAgain: true,
      message: `Unable to request ${kind === "library" ? "photo library" : "camera"} permission. Please try again.`,
    };
  }
};

/**
 * Show alert with option to open device settings
 */
export const showMediaPermissionAlert = (
  message: string,
  onOpenSettings: () => void,
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
    { cancelable: true },
  );
};

/**
 * Open app settings (iOS deep link to Photos/Camera row when possible)
 */
export const openMediaSettings = async (
  kind: MediaPermissionKind = "library",
): Promise<void> => {
  const messages = getMessages(kind);

  try {
    if (Platform.OS === "ios") {
      const bundleId =
        Constants.expoConfig?.ios?.bundleIdentifier ?? "com.freshpass";

      const iosDeepLinks =
        kind === "library"
          ? [
              `app-settings:root=Photos&path=${bundleId}`,
              `app-settings:root=${bundleId}`,
            ]
          : [`app-settings:root=${bundleId}`];

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

    await Linking.openSettings();
  } catch (error) {
    Logger.error("Error opening settings:", error);
    Alert.alert("Unable to open settings", messages.settingsFallback);
  }
};

const handleMediaPermission = async (
  kind: MediaPermissionKind,
): Promise<boolean> => {
  const messages = getMessages(kind);

  const existing = await getExistingPermission(kind);

  if (existing.status === ImagePicker.PermissionStatus.GRANTED) {
    return true;
  }

  const isIosDenied =
    Platform.OS === "ios" &&
    existing.status === ImagePicker.PermissionStatus.DENIED;

  const isAndroidPermanentlyDenied =
    Platform.OS === "android" &&
    existing.status === ImagePicker.PermissionStatus.DENIED &&
    existing.canAskAgain === false;

  if (isIosDenied || isAndroidPermanentlyDenied) {
    const alertMessage = isIosDenied ? messages.iosAlert : messages.settings;

    showMediaPermissionAlert(alertMessage, () => {
      void openMediaSettings(kind);
    });
    return false;
  }

  const result = await requestMediaPermission(kind);

  if (result.granted) {
    return true;
  }

  if (!result.canRequestAgain) {
    showMediaPermissionAlert(messages.settings, () => {
      void openMediaSettings(kind);
    });
    return false;
  }

  Alert.alert("Permission Required", result.message || messages.denied, [
    { text: "OK" },
  ]);
  return false;
};

/** @deprecated Use handleMediaLibraryPermission — kept for direct callers */
export const requestMediaLibraryPermission = async (): Promise<MediaPermissionResult> =>
  requestMediaPermission("library");

/** @deprecated Use handleCameraPermission — kept for direct callers */
export const requestCameraPermission = async (): Promise<MediaPermissionResult> =>
  requestMediaPermission("camera");

/**
 * Complete media library permission flow with alert handling.
 * Returns true if permission granted, false otherwise.
 */
export const handleMediaLibraryPermission = async (): Promise<boolean> =>
  handleMediaPermission("library");

/**
 * Complete camera permission flow with alert handling.
 * Returns true if permission granted, false otherwise.
 */
export const handleCameraPermission = async (): Promise<boolean> =>
  handleMediaPermission("camera");
