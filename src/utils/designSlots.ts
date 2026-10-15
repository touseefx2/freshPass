import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import {
  exportProject,
  getVideoInfo,
  makeClipId,
  SCHEMA_VERSION,
  type Project,
} from "expo-media-edit";
import { handleMediaLibraryPermission } from "@/src/services/mediaPermissionService";
import {
  MAX_VIDEO_UPLOAD_SECONDS,
  uploadImage,
  uploadVideo,
} from "@/src/services/mediaLibraryService";
import { measureVideoDurationSeconds } from "@/src/utils/videoDuration";
import { ensureLocalMediaFileUri } from "@/src/utils/localMediaUri";
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
  /**
   * Video longer than the slot: the phone video it was cut from and where the
   * cut starts — Move reopens the trimmer on it.
   */
  source?: { uri: string; durationSeconds: number; at: number } | null;
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
 * doesn't fit (wrong type, video shorter than `min_seconds`, or over 30 s on
 * a slot without a length — longer ones are cut to the slot, see `slotNeedsCut`).
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
    if (min > 0) {
      // The slot plays `min` seconds — the video must be at least that long
      // (cut down to it when longer). Same rounding as the "7s" on the clip.
      if (durationSeconds == null) {
        try {
          const info = await getVideoInfo(
            await ensureLocalMediaFileUri(asset.uri, "mp4"),
          );
          if (info.durationMs > 0) durationSeconds = info.durationMs / 1000;
        } catch {
          // Unknown length — refused below
        }
      }
      if (durationSeconds == null) {
        return { error: t("designSlotVideoLengthUnknown") };
      }
      // 0.05 s slack for encoders that write 6.97 s for a 7 s clip
      if (durationSeconds < min - 0.05) {
        return {
          error: t("designSlotVideoTooShortHave", {
            seconds: Math.round(min),
            have: Math.floor(durationSeconds * 10) / 10,
          }),
        };
      }
    }
    if (
      !min &&
      durationSeconds != null &&
      durationSeconds > MAX_VIDEO_UPLOAD_SECONDS
    ) {
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

/** Video file longer than the slot's clip → the user picks which part to keep. */
export function slotNeedsCut(slot: AutoReelSlot, file: SlotFile): boolean {
  const seconds = slot.kind === "video" ? (slot.min_seconds ?? 0) : 0;
  return (
    file.kind === "video" &&
    seconds > 0 &&
    file.durationSeconds != null &&
    file.durationSeconds > seconds + 0.25
  );
}

/** file:// copy of a picked video (expo-media-edit can't open content:// / ph://). */
export function localSlotVideoUri(file: SlotFile): Promise<string> {
  const ext = file.fileName.split(".").pop() || "mp4";
  return ensureLocalMediaFileUri(file.uri, ext);
}

/**
 * Cut `seconds` from `at` out of a phone video, on the phone (expo-media-edit).
 * The cut is what gets uploaded; `source` keeps the full video for Move.
 */
export async function cutSlotVideo(
  file: SlotFile,
  source: { uri: string; durationSeconds: number },
  at: number,
  seconds: number,
): Promise<SlotFile> {
  const startMs = Math.max(
    0,
    Math.min(Math.round(at * 1000), Math.round((source.durationSeconds - seconds) * 1000)),
  );
  const lengthMs = Math.round(seconds * 1000);
  const info = await getVideoInfo(source.uri);
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  const width = even(info.width || file.width || 1080);
  const height = even(info.height || file.height || 1920);
  const project: Project = {
    id: makeClipId("slot"),
    schemaVersion: SCHEMA_VERSION,
    canvasSize: { width, height },
    durationMs: lengthMs,
    tracks: [
      {
        kind: "video",
        id: "v",
        clips: [
          {
            id: makeClipId("clip"),
            sourceUri: source.uri,
            sourceRange: { startMs, endMs: startMs + lengthMs },
            timelineRange: { startMs: 0, endMs: lengthMs },
          },
        ],
      },
    ],
  };
  const uri = await exportProject(project, undefined, { quality: "high" });
  let thumbnailUri: string | null = null;
  try {
    thumbnailUri = (
      await VideoThumbnails.getThumbnailAsync(uri, { time: 0, quality: 0.6 })
    ).uri;
  } catch {
    // Thumbnail is cosmetic only
  }
  return {
    ...file,
    uri,
    mimeType: "video/mp4",
    fileName: "clip.mp4",
    width,
    height,
    durationSeconds: seconds,
    thumbnailUri,
    mediaId: null,
    source: { ...source, at: startMs / 1000 },
  };
}
