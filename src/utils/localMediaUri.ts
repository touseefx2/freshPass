import * as FileSystem from "expo-file-system/legacy";
import Logger from "@/src/services/logger";

/**
 * expo-media-edit only accepts file:// or https:// sources.
 * ImagePicker / camera can return content://, ph://, or bare paths —
 * copy those into the app cache so preview + export can open them.
 */
export async function ensureLocalMediaFileUri(
  uri: string,
  hintExt = "mp4",
): Promise<string> {
  if (!uri) return uri;

  let normalized = uri.trim();
  if (
    !normalized.startsWith("file://") &&
    !normalized.startsWith("https://") &&
    !normalized.startsWith("content://") &&
    !normalized.startsWith("ph://") &&
    !normalized.startsWith("assets-library://") &&
    normalized.startsWith("/")
  ) {
    normalized = `file://${normalized}`;
  }

  if (normalized.startsWith("file://") || normalized.startsWith("https://")) {
    return normalized;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("Cache directory unavailable");
  }

  const fromName = normalized.split("/").pop()?.split("?")[0] || "";
  const extFromName = fromName.includes(".")
    ? fromName.substring(fromName.lastIndexOf(".") + 1)
    : "";
  const ext = (extFromName || hintExt).replace(/[^a-zA-Z0-9]/g, "") || "mp4";
  const dest = `${cacheDir}media-edit-${Date.now()}.${ext}`;

  try {
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest.startsWith("file://") ? dest : `file://${dest}`;
  } catch (error) {
    Logger.error("ensureLocalMediaFileUri copy failed:", error);
    throw error;
  }
}

/** Drop TIME_UNSET / NaN playhead values from native players. */
export function sanitizePlayheadMs(ms: unknown, maxMs = 24 * 60 * 60 * 1000): number | null {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  if (ms < 0 || ms > maxMs) return null;
  return ms;
}
