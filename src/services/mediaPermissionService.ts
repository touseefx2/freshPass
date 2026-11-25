import * as ImagePicker from "expo-image-picker";
import Constants from "expo-constants";
import { AppState, Platform, Alert, Linking } from "react-native";
import i18n from "i18next";
import Logger from "./logger";

export interface MediaPermissionResult {
  granted: boolean;
  canRequestAgain: boolean;
  message: string;
}

type MediaPermissionKind = "library" | "camera";

// In-memory cache: once granted, skip the native bridge call on subsequent taps.
// Cleared when the app returns from background (user may have toggled permission
// in Settings while away).
const grantedCache: Record<MediaPermissionKind, boolean> = {
  library: false,
  camera: false,
};
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    grantedCache.library = false;
    grantedCache.camera = false;
  }
});

const getMessages = (kind: MediaPermissionKind) =>
  kind === "library"
    ? {
        denied: i18n.t("mediaPermGalleryDenied"),
        settings: i18n.t("mediaPermGallerySettings"),
        iosAlert: i18n.t("mediaPermGalleryIosAlert"),
        iosError: i18n.t("mediaPermGalleryIosError"),
        settingsFallback: i18n.t("mediaPermGallerySettingsFallback"),
      }
    : {
        denied: i18n.t("mediaPermCameraDenied"),
        settings: i18n.t("mediaPermCameraSettings"),
        iosAlert: i18n.t("mediaPermCameraIosAlert"),
        iosError: i18n.t("mediaPermCameraIosError"),
        settingsFallback: i18n.t("mediaPermCameraSettingsFallback"),
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
      message:
        kind === "library"
          ? i18n.t("mediaPermRequestFailedLibrary")
          : i18n.t("mediaPermRequestFailedCamera"),
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
    i18n.t("mediaPermPermissionRequired"),
    message,
    [
      {
        text: i18n.t("cancel"),
        style: "cancel",
      },
      {
        text: i18n.t("mediaPermOpenSettings"),
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
    Alert.alert(i18n.t("mediaPermUnableOpenSettings"), messages.settingsFallback);
  }
};

const handleMediaPermission = async (
  kind: MediaPermissionKind,
): Promise<boolean> => {
  if (grantedCache[kind]) return true;

  const messages = getMessages(kind);

  const existing = await getExistingPermission(kind);

  if (existing.status === ImagePicker.PermissionStatus.GRANTED) {
    grantedCache[kind] = true;
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
    grantedCache[kind] = true;
    return true;
  }

  if (!result.canRequestAgain) {
    showMediaPermissionAlert(messages.settings, () => {
      void openMediaSettings(kind);
    });
    return false;
  }

  Alert.alert(i18n.t("mediaPermPermissionRequired"), result.message || messages.denied, [
    { text: i18n.t("ok") },
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
