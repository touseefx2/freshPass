import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import { handleMediaLibraryPermission } from "@/src/services/mediaPermissionService";
import {
  MAX_VIDEO_UPLOAD_SECONDS,
  uploadImage,
  uploadVideo,
} from "@/src/services/mediaLibraryService";
import { measureVideoDurationSeconds } from "@/src/utils/videoDuration";
import type { MediaUploadSourceType } from "@/src/types/media";
import type { AutoReelSlot } from "@/src/types/reels";

/**
 * The user's own photo / video for a design slot: picked on the phone,
 * uploaded with POST /api/media (no `purpose`) when the reel is started.
 */

type Translate = (key: string, options?: Record<string, unknown>) => string;

export type SlotFile = {
  uri: string;
  kind: "image" | "video";
  mimeType: string;
  fileName: string;
  sourceType: MediaUploadSourceType;
  width?: number;
  height?: number;
  /** Videos only */
  durationSeconds: number | null;
  thumbnailUri: string | null;
  /** Set once uploaded; cleared when the server refuses it (upload again next time) */
  mediaId: number | null;
};

const iosCompatiblePickerOptions =
  Platform.OS === "ios"
    ? {
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      }
    : {};

/** Types this slot takes (falls back to its kind when `accepts` is empty). */
export function slotAccepts(slot: AutoReelSlot): ("image" | "video")[] {
  const accepts = (slot.accepts ?? []).filter(
    (a): a is "image" | "video" => a === "image" || a === "video",
  );
  if (accepts.length) return accepts;
  return slot.kind === "video" ? ["video"] : ["image"];
}

/**
 * Gallery pick for one slot. Returns the file, or an error message when it
 * doesn't fit (wrong type, video shorter than `min_seconds` or over 30 s).
 * null = cancelled / no permission.
 */
export async function pickSlotFile(
  slot: AutoReelSlot,
  t: Translate,
): Promise<{ file: SlotFile } | { error: string } | null> {
  const accepts = slotAccepts(slot);
  const hasPermission = await handleMediaLibraryPermission();
  if (!hasPermission) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: accepts.map((a) => (a === "image" ? "images" : "videos")),
    allowsMultipleSelection: false,
    quality: 1,
    allowsEditing: false,
    ...iosCompatiblePickerOptions,
  });
  const asset = result.canceled ? null : result.assets?.[0];
  if (!asset?.uri) return null;

  const kind: "image" | "video" = asset.type === "video" ? "video" : "image";
  if (!accepts.includes(kind)) {
    return {
      error: kind === "video" ? t("designSlotNeedsPhoto") : t("designSlotNeedsVideo"),
    };
  }

  let durationSeconds: number | null = null;
  let thumbnailUri: string | null = kind === "image" ? asset.uri : null;
  if (kind === "video") {
    // expo-image-picker reports video length in milliseconds
    durationSeconds =
      typeof asset.duration === "number" && asset.duration > 0
        ? asset.duration / 1000
        : await measureVideoDurationSeconds(asset.uri);
    const min = slot.min_seconds ?? 0;
    if (durationSeconds != null && min > 0 && durationSeconds < min) {
      return { error: t("designSlotVideoTooShort", { seconds: Math.ceil(min) }) };
    }
    if (durationSeconds != null && durationSeconds > MAX_VIDEO_UPLOAD_SECONDS) {
      return {
        error: t("designSlotVideoTooLong", { seconds: MAX_VIDEO_UPLOAD_SECONDS }),
      };
    }
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
        time: 0,
        quality: 0.6,
      });
      thumbnailUri = thumb.uri;
    } catch {
      // Thumbnail is cosmetic only
    }
  }

  const mime = (asset as { mimeType?: string }).mimeType ?? "";
  return {
    file: {
      uri: asset.uri,
      kind,
      mimeType: mime || (kind === "image" ? "image/jpeg" : "video/mp4"),
      fileName: asset.fileName || (kind === "image" ? "photo.jpg" : "video.mp4"),
      sourceType: "device",
      width: asset.width || undefined,
      height: asset.height || undefined,
      durationSeconds,
      thumbnailUri,
      mediaId: null,
    },
  };
}

/** Upload a slot file (no `purpose`) and return its media id. */
export async function uploadSlotFile(
  file: SlotFile,
  options: { signal?: AbortSignal; onProgress?: (percent: number) => void } = {},
): Promise<number> {
  if (file.kind === "image") {
    const uploaded = await uploadImage(
      {
        uri: file.uri,
        mimeType: file.mimeType,
        fileName: file.fileName,
        sourceType: file.sourceType,
        width: file.width,
        height: file.height,
        signal: options.signal,
      },
      options.onProgress,
    );
    return uploaded.id;
  }
  const uploaded = await uploadVideo(
    {
      uri: file.uri,
      mimeType: file.mimeType,
      fileName: file.fileName,
      sourceType: file.sourceType,
      durationSeconds: Math.max(1, Math.round(file.durationSeconds ?? 1)),
      width: file.width,
      height: file.height,
      signal: options.signal,
    },
    options.onProgress,
  );
  return uploaded.id;
}
