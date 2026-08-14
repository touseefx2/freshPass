import * as ImageManipulator from "expo-image-manipulator";
import Logger from "@/src/services/logger";

export type PreparedImageFile = {
  uri: string;
  type: "image/jpeg";
  name: string;
};

const IMAGE_EXT_RE = /\.(jpe?g|png|gif|bmp|webp|heic|heif|tiff?|avif)$/i;
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|webm|avi|mkv)$/i;

/**
 * True when the URI is almost certainly a video (skip JPEG conversion).
 */
export function isLikelyVideoUri(uri: string): boolean {
  const path = (uri || "").split("?")[0] || "";
  return VIDEO_EXT_RE.test(path);
}

/**
 * True when the URI looks like an image (or has no extension — e.g. ph:// assets).
 */
export function isLikelyImageUri(uri: string): boolean {
  if (!uri) return false;
  if (isLikelyVideoUri(uri)) return false;
  const path = uri.split("?")[0] || "";
  if (IMAGE_EXT_RE.test(path)) return true;
  // Local picker assets without a real extension (ph://, content://, etc.)
  if (
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library://") ||
    uri.startsWith("content://") ||
    uri.startsWith("file://")
  ) {
    return true;
  }
  return false;
}

/**
 * Convert a local image URI to JPEG so Laravel's `image` rule accepts it.
 * iPhone gallery multi-select often returns HEIC; backend rejects those.
 */
export async function prepareImageForUpload(
  uri: string,
  fileNamePrefix: string = "upload",
): Promise<PreparedImageFile> {
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.85,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const name = `${fileNamePrefix}_${Date.now()}.jpg`;

  return {
    uri: result.uri,
    type: "image/jpeg",
    name,
  };
}

/**
 * Prepare many images for multipart upload. Failures are logged and skipped.
 */
export async function prepareImagesForUpload(
  uris: string[],
  fileNamePrefix: string = "upload",
): Promise<PreparedImageFile[]> {
  const prepared: PreparedImageFile[] = [];

  for (let i = 0; i < uris.length; i++) {
    const uri = uris[i];
    if (!uri) continue;
    try {
      prepared.push(await prepareImageForUpload(uri, `${fileNamePrefix}_${i}`));
    } catch (error) {
      Logger.error("Failed to prepare image for upload:", error);
    }
  }

  return prepared;
}
