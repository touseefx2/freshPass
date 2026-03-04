import { Platform, Linking } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

/**
 * Downloads media from URL and saves to device gallery (Android/iOS).
 * On web, opens the URL in browser.
 * @param uri - Remote URL of image or video
 * @returns true if saved successfully (or opened on web), false otherwise
 */
export async function saveMediaToGallery(uri: string): Promise<boolean> {
  if (Platform.OS === "web") {
    try {
      const canOpen = await Linking.canOpenURL(uri);
      if (canOpen) await Linking.openURL(uri);
      return true;
    } catch {
      return false;
    }
  }
  try {
    const filename = uri.split("/").pop()?.split("?")[0] || "image.jpg";
    const ext = filename.includes(".")
      ? filename.substring(filename.lastIndexOf("."))
      : ".jpg";
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return false;
    const localUri = `${cacheDir}${Date.now()}${ext}`;
    const { uri: downloadedUri } = await FileSystem.downloadAsync(
      uri,
      localUri,
    );
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== "granted") return false;
    await MediaLibrary.saveToLibraryAsync(downloadedUri);
    return true;
  } catch {
    return false;
  }
}
