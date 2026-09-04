import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type OpenNotificationSettingsNativeModule = {
  open: () => Promise<boolean>;
};

const OpenNotificationSettingsNative =
  requireOptionalNativeModule<OpenNotificationSettingsNativeModule>(
    "OpenNotificationSettings",
  );

/**
 * Opens the app's Notification settings screen on iOS 15.4+
 * (Allow Notifications, Banners, Sounds, etc.).
 * Returns false if the native module is unavailable or open failed.
 */
export async function openNativeNotificationSettings(): Promise<boolean> {
  if (Platform.OS !== "ios" || !OpenNotificationSettingsNative?.open) {
    return false;
  }

  try {
    return await OpenNotificationSettingsNative.open();
  } catch {
    return false;
  }
}
