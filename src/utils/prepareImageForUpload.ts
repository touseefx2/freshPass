import * as ImageManipulator from "expo-image-manipulator";
import { Image as RNImage, Platform } from "react-native";
import {
  Image as CompressorImage,
  Video as CompressorVideo,
  getRealPath,
} from "react-native-compressor";
import Logger from "@/src/services/logger";

export type PreparedImageFile = {
  uri: string;
  type: "image/jpeg";
  name: string;
};

export type PreparedVideoFile = {
  uri: string;
  type: string;
  name: string;
};

/** Mild image settings — keeps quality, caps dimension + JPEG size. */
const IMAGE_MAX_DIMENSION = 1920;
const IMAGE_QUALITY = 0.82;

/**
 * Mild video settings — prefer size win without WhatsApp-level quality loss.
 * maxSize 1920 keeps ~1080p vertical reels; bitrate ~4.5 Mbps is social-friendly.
 * Skip compression for small files (< 6 MB).
 */
const VIDEO_MAX_SIZE = 1920;
const VIDEO_BITRATE = 4_500_000;
const VIDEO_MIN_FILE_SIZE_MB = 6;

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

function ensureFileUri(uri: string): string {
  if (!uri) return uri;
  if (
    uri.startsWith("file://") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://") ||
    uri.startsWith("content://") ||
    uri.startsWith("ph://") ||
    uri.startsWith("assets-library://")
  ) {
    return uri;
  }
  if (uri.startsWith("/")) return `file://${uri}`;
  return uri;
}

function guessVideoMimeType(uri: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const lower = uri.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function guessVideoFileName(uri: string, mimeType: string): string {
  const fromUri = uri.split("/").pop()?.split("?")[0];
  if (fromUri && fromUri.includes(".")) return fromUri;
  if (mimeType.includes("quicktime")) return "video.mov";
  if (mimeType.includes("webm")) return "video.webm";
  if (mimeType.includes("m4v")) return "video.m4v";
  return "video.mp4";
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    );
  });
}

/**
 * Fallback when native compressor is unavailable (web / missing rebuild).
 * Mild resize + JPEG — same intent as react-native-compressor path.
 */
async function prepareImageWithManipulator(
  uri: string,
  fileNamePrefix: string,
): Promise<PreparedImageFile> {
  const actions: ImageManipulator.Action[] = [];

  try {
    const { width, height } = await getImageSize(uri);
    if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
      if (width >= height) {
        actions.push({ resize: { width: IMAGE_MAX_DIMENSION } });
      } else {
        actions.push({ resize: { height: IMAGE_MAX_DIMENSION } });
      }
    }
  } catch {
    // Size unknown — still convert to JPEG below
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: IMAGE_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    type: "image/jpeg",
    name: `${fileNamePrefix}_${Date.now()}.jpg`,
  };
}

/**
 * Convert + mildly compress a local image for multipart upload.
 * Uses react-native-compressor (stable Expo plugin); falls back to
 * expo-image-manipulator on web or if native module is not linked yet.
 */
export async function prepareImageForUpload(
  uri: string,
  fileNamePrefix: string = "upload",
): Promise<PreparedImageFile> {
  const name = `${fileNamePrefix}_${Date.now()}.jpg`;

  if (Platform.OS !== "web") {
    try {
      let inputUri = uri;
      try {
        inputUri = await getRealPath(uri, "image");
      } catch {
        // ph:// / content:// may already be usable; continue with original
      }

      const compressed = await CompressorImage.compress(inputUri, {
        compressionMethod: "manual",
        maxWidth: IMAGE_MAX_DIMENSION,
        maxHeight: IMAGE_MAX_DIMENSION,
        quality: IMAGE_QUALITY,
        output: "jpg",
      });

      return {
        uri: ensureFileUri(compressed),
        type: "image/jpeg",
        name,
      };
    } catch (error) {
      Logger.warn(
        "Image compressor failed, falling back to ImageManipulator:",
        error,
      );
    }
  }

  return prepareImageWithManipulator(uri, fileNamePrefix);
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

/**
 * Mildly compress a local video before upload (reels, AI tools, chat, camera).
 * On failure / web, returns the original URI so upload can still proceed.
 */
export async function prepareVideoForUpload(
  uri: string,
  options?: {
    fileName?: string | null;
    mimeType?: string | null;
    onProgress?: (percent: number) => void;
  },
): Promise<PreparedVideoFile> {
  const mimeType = guessVideoMimeType(uri, options?.mimeType);
  const fileName =
    options?.fileName || guessVideoFileName(uri, mimeType);

  if (Platform.OS === "web") {
    return { uri, type: mimeType, name: fileName };
  }

  try {
    let inputUri = uri;
    try {
      inputUri = await getRealPath(uri, "video");
    } catch {
      // Continue with original URI
    }

    const compressed = await CompressorVideo.compress(
      inputUri,
      {
        compressionMethod: "manual",
        maxSize: VIDEO_MAX_SIZE,
        bitrate: VIDEO_BITRATE,
        minimumFileSizeForCompress: VIDEO_MIN_FILE_SIZE_MB,
      },
      (progress) => {
        // Library reports 0–1
        const percent = Math.min(
          100,
          Math.round((typeof progress === "number" ? progress : 0) * 100),
        );
        options?.onProgress?.(percent);
      },
    );

    const outUri = ensureFileUri(compressed);
    const outMime = guessVideoMimeType(outUri, mimeType);
    const outName = guessVideoFileName(outUri, outMime) || fileName;

    options?.onProgress?.(100);

    return {
      uri: outUri,
      type: outMime,
      name: options?.fileName || outName,
    };
  } catch (error) {
    Logger.warn(
      "Video compressor failed, uploading original file:",
      error,
    );
    return { uri, type: mimeType, name: fileName };
  }
}
