import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  prepareImageForUpload,
  prepareVideoForUpload,
} from "@/src/utils/prepareImageForUpload";
import type { ReviewUploadFile } from "@/src/services/afterVisitService";

/**
 * Review photo / video limits (POST /api/reviews). The server reads the file
 * itself and allows a clip that measures up to 30.5 s.
 */
export const REVIEW_VIDEO_MAX_SECONDS = 30;
const REVIEW_VIDEO_MAX_MS = 30_500;
export const REVIEW_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const REVIEW_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/** A photo / video on the review form: one the customer just picked, or the saved one. */
export type ReviewMedia = {
  uri: string;
  /** false = already on the review (a URL) */
  isLocal: boolean;
  durationMs?: number | null;
};

export type ReviewVideoPick =
  | { status: "picked"; media: ReviewMedia }
  | { status: "tooLong" }
  | { status: "cancelled" };

// iOS hands over an H.264 copy instead of the HEVC original (the server rejects HEVC).
const iosCompatible =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

/** Camera capped at 30 s; a gallery video longer than 30 s comes back as `tooLong`. */
export async function launchReviewVideoPicker(
  source: "camera" | "library",
): Promise<ReviewVideoPick> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["videos"],
    allowsMultipleSelection: false,
    quality: 1,
    videoMaxDuration: REVIEW_VIDEO_MAX_SECONDS,
    ...iosCompatible,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return { status: "cancelled" };
  // expo-image-picker reports duration in ms (null when unknown)
  if ((asset.duration ?? 0) > REVIEW_VIDEO_MAX_MS) return { status: "tooLong" };
  return {
    status: "picked",
    media: {
      uri: asset.uri,
      isLocal: true,
      durationMs: asset.duration ?? null,
    },
  };
}

export class ReviewFileTooLargeError extends Error {
  constructor(public readonly kind: "image" | "video") {
    super(`review ${kind} too large`);
  }
}

async function localFileSize(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === "number" ? info.size : null;
  } catch {
    return null;
  }
}

/** JPEG, longest side ≤ 1920 — always well under 10 MB. */
export async function prepareReviewPhoto(uri: string): Promise<ReviewUploadFile> {
  const prepared = await prepareImageForUpload(uri, "review_photo");
  const size = await localFileSize(prepared.uri);
  if (size != null && size > REVIEW_PHOTO_MAX_BYTES) {
    throw new ReviewFileTooLargeError("image");
  }
  return prepared;
}

/**
 * Re-encode to an H.264 MP4 (same compressor as reel uploads). If compression
 * fails the original goes up — on iOS that's already H.264 (Compatible mode).
 */
export async function prepareReviewVideo(
  media: ReviewMedia,
  onProgress?: (percent: number) => void,
): Promise<ReviewUploadFile> {
  // Name and type follow the output file (an .MOV comes back as .mp4)
  const prepared = await prepareVideoForUpload(media.uri, {
    onProgress,
    alwaysReencode: true,
  });
  const size = await localFileSize(prepared.uri);
  if (size != null && size > REVIEW_VIDEO_MAX_BYTES) {
    throw new ReviewFileTooLargeError("video");
  }
  return prepared;
}

/** 24500 → "0:25" */
export function formatClipDuration(ms?: number | null): string | null {
  if (!ms || ms <= 0) return null;
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
