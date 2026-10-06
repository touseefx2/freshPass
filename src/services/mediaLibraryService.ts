import * as FileSystem from "expo-file-system/legacy";
import { ApiService, checkInternetConnection } from "@/src/services/api";
import { mediaEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";
import { getVideoMetaData } from "react-native-compressor";
import { prepareVideoForUpload, prepareImageForUpload } from "@/src/utils/prepareImageForUpload";
import type {
  MediaDeleteResponse,
  MediaItemResponse,
  MediaLimits,
  MediaLimitsResponse,
  MediaListMeta,
  MediaListResponse,
  MediaUploadPurpose,
  MediaUploadSourceType,
  MediaVideo,
} from "@/src/types/media";

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "";

export const MEDIA_VIDEOS_PER_PAGE = 30;

function getAccessToken(): string | null {
  try {
    return store.getState().user?.accessToken || null;
  } catch {
    return null;
  }
}

function guessMimeType(uri: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const lower = uri.toLowerCase();
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".m4v")) return "video/x-m4v";
  if (lower.endsWith(".webm")) return "video/webm";
  return "video/mp4";
}

function guessFileName(uri: string, mimeType: string): string {
  const fromUri = uri.split("/").pop()?.split("?")[0];
  if (fromUri && fromUri.includes(".")) return fromUri;
  if (mimeType.includes("quicktime")) return "video.mov";
  if (mimeType.includes("webm")) return "video.webm";
  if (mimeType.includes("m4v")) return "video.m4v";
  return "video.mp4";
}

export async function listVideos(
  page: number = 1,
  perPage: number = MEDIA_VIDEOS_PER_PAGE,
  status?: string,
): Promise<{ videos: MediaVideo[]; meta: MediaListMeta }> {
  const response = await ApiService.get<MediaListResponse>(
    mediaEndpoints.list({ page, per_page: perPage, status }),
  );
  const videos = response?.data?.data ?? [];
  const meta = response?.data?.meta ?? {
    current_page: page,
    per_page: perPage,
    total: videos.length,
    last_page: page,
    from: videos.length ? 1 : null,
    to: videos.length || null,
    has_more: false,
  };
  return { videos, meta };
}

export async function getVideo(id: number | string): Promise<MediaVideo> {
  const response = await ApiService.get<MediaItemResponse>(
    mediaEndpoints.getById(id),
  );
  if (!response?.data) {
    throw new Error(response?.message || "Video not found");
  }
  return response.data;
}

/**
 * Copy a completed Generate Reel AI job into the business video library (R-19).
 * Returns status "ready" immediately — no polling required.
 */
export async function importVideoFromAi(jobId: string): Promise<MediaVideo> {
  const response = await ApiService.post<MediaItemResponse>(
    mediaEndpoints.fromAi,
    { job_id: jobId },
  );
  if (!response?.data) {
    throw new Error(response?.message || "Failed to save reel to library");
  }
  return response.data;
}

let cachedMediaLimits: MediaLimits | null = null;
let mediaLimitsInflight: Promise<MediaLimits> | null = null;

/**
 * Follower-based reel length + AI caps. Cached for the session so record /
 * upload / edit / Generate Reel share one fetch.
 */
export async function getMediaLimits(
  options?: { force?: boolean },
): Promise<MediaLimits> {
  if (!options?.force && cachedMediaLimits) {
    return cachedMediaLimits;
  }
  if (!options?.force && mediaLimitsInflight) {
    return mediaLimitsInflight;
  }
  mediaLimitsInflight = (async () => {
    const response = await ApiService.get<MediaLimitsResponse>(
      mediaEndpoints.limits,
    );
    if (!response?.data) {
      throw new Error(response?.message || "Media limits not found");
    }
    cachedMediaLimits = response.data;
    return response.data;
  })();
  try {
    return await mediaLimitsInflight;
  } finally {
    mediaLimitsInflight = null;
  }
}

export function getCachedMediaLimits(): MediaLimits | null {
  return cachedMediaLimits;
}

/**
 * R-02: uploads arrive as `processing`. Publish requires `ready` — poll until
 * the worker finishes (or fails / times out).
 */
export async function waitForMediaReady(
  id: number | string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onStatus?: (video: MediaVideo) => void;
  },
): Promise<MediaVideo> {
  const intervalMs = options?.intervalMs ?? 4000;
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000;
  const startedAt = Date.now();

  let latest = await getVideo(id);
  options?.onStatus?.(latest);

  while (latest.status === "processing") {
    if (Date.now() - startedAt > timeoutMs) {
      const error = new Error(
        "This video is still processing. Try publishing once it is ready.",
      );
      (error as any).isProcessingTimeout = true;
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    latest = await getVideo(id);
    options?.onStatus?.(latest);
  }

  if (latest.status === "failed") {
    throw new Error("Video processing failed. Please upload again.");
  }

  return latest;
}

export async function deleteVideo(id: number | string): Promise<MediaDeleteResponse> {
  return ApiService.delete<MediaDeleteResponse>(mediaEndpoints.deleteOne(id));
}

export async function deleteVideos(
  ids: number[],
): Promise<MediaDeleteResponse> {
  return ApiService.delete<MediaDeleteResponse>(mediaEndpoints.deleteBulk, {
    data: { ids },
  });
}

/** Backend rejects videos longer than this (POST /api/media). */
export const MAX_VIDEO_UPLOAD_SECONDS = 30;

/** Raw videos for AI Auto Reels (`purpose=auto_reel_source`) may be up to 3 minutes. */
export const MAX_AUTO_REEL_SOURCE_SECONDS = 180;

/** Server rejects video uploads over 200 MB (nginx answers > 210 MB with HTML 413). */
export const MAX_VIDEO_UPLOAD_BYTES = 200 * 1024 * 1024;

/** Thrown before upload, or on 413 / non-JSON responses, so the UI can say "too large". */
export class VideoTooLargeError extends Error {
  isTooLarge = true;
  constructor() {
    super("This video is larger than 200 MB. Trim it or record a shorter one.");
  }
}

/**
 * Size of the file actually being uploaded, as shown on the phone. Compression
 * caps the longest side at 1920, so the picked asset's size (e.g. 4K) is wrong
 * for the uploaded file. Orientation follows the picked asset (portrait stays
 * width < height) in case the compressed file stores a rotation flag instead.
 */
async function resolveUploadDimensions(
  preparedUri: string,
  originalUri: string,
  original: { width?: number | null; height?: number | null },
): Promise<{ width?: number; height?: number }> {
  const fallback = {
    width: original.width ?? undefined,
    height: original.height ?? undefined,
  };
  // Sent as-is (small file or compression skipped/failed) — original size is right
  if (preparedUri === originalUri) return fallback;
  try {
    const meta = await getVideoMetaData(preparedUri);
    let width = Math.round(Number(meta?.width));
    let height = Math.round(Number(meta?.height));
    if (!(width > 0 && height > 0)) return fallback;
    const originalPortrait =
      original.width != null &&
      original.height != null &&
      original.width < original.height;
    const originalLandscape =
      original.width != null &&
      original.height != null &&
      original.width > original.height;
    if ((originalPortrait && width > height) || (originalLandscape && width < height)) {
      [width, height] = [height, width];
    }
    return { width, height };
  } catch (error) {
    Logger.warn("Could not read compressed video size:", error);
    return fallback;
  }
}

async function getLocalFileSize(uri: string): Promise<number | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && typeof info.size === "number" ? info.size : null;
  } catch {
    return null;
  }
}

export type UploadVideoParams = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  sourceType: MediaUploadSourceType;
  /** Required by API — integer seconds, max 30 (180 for auto_reel_source) */
  durationSeconds: number;
  width?: number | null;
  height?: number | null;
  /** Auto reel source videos are hidden from the library and allow 3 minutes */
  purpose?: MediaUploadPurpose;
  /** Client-side compression progress (0–100), before the upload starts */
  onCompressProgress?: (percent: number) => void;
};

/**
 * Upload a video with real byte progress via XMLHttpRequest.
 * POST /api/media — multipart field `file` + required `duration_seconds`.
 */
export function uploadVideo(
  params: UploadVideoParams,
  onProgress?: (percent: number) => void,
): Promise<MediaVideo> {
  return new Promise(async (resolve, reject) => {
    try {
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        const error = new Error("No internet connection");
        (error as any).isNoInternet = true;
        reject(error);
        return;
      }

      const accessToken = getAccessToken();
      if (!accessToken) {
        reject(new Error("Not authenticated"));
        return;
      }

      // Mild client-side compress before upload (reels / camera / gallery)
      const prepared = await prepareVideoForUpload(params.uri, {
        fileName: params.fileName,
        mimeType: params.mimeType,
        onProgress: params.onCompressProgress,
      });
      // Compression can fail and fall back to the original — check before sending
      const preparedSize = await getLocalFileSize(prepared.uri);
      if (preparedSize != null && preparedSize > MAX_VIDEO_UPLOAD_BYTES) {
        reject(new VideoTooLargeError());
        return;
      }
      const mimeType = prepared.type || guessMimeType(prepared.uri, params.mimeType);
      const fileName =
        prepared.name || params.fileName || guessFileName(prepared.uri, mimeType);

      const formData = new FormData();
      formData.append("file", {
        uri: prepared.uri,
        type: mimeType,
        name: fileName,
      } as any);
      formData.append("source_type", params.sourceType);
      if (params.purpose) {
        formData.append("purpose", params.purpose);
      }
      const maxSeconds =
        params.purpose === "auto_reel_source"
          ? MAX_AUTO_REEL_SOURCE_SECONDS
          : MAX_VIDEO_UPLOAD_SECONDS;
      const durationSeconds = Math.max(
        1,
        Math.min(maxSeconds, Math.round(params.durationSeconds)),
      );
      formData.append("duration_seconds", String(durationSeconds));
      const dims = await resolveUploadDimensions(prepared.uri, params.uri, params);
      if (dims.width != null) {
        formData.append("width", String(dims.width));
      }
      if (dims.height != null) {
        formData.append("height", String(dims.height));
      }

      const baseUrl = BASE_URL.endsWith("/")
        ? BASE_URL.slice(0, -1)
        : BASE_URL;
      const url = `${baseUrl}${mediaEndpoints.upload}`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("Accept", "application/json");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) return;
        const percent = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );
        onProgress(percent);
      };

      xhr.onload = () => {
        // nginx rejects > 210 MB with an HTML 413 page before the API sees it
        if (xhr.status === 413) {
          reject(new VideoTooLargeError());
          return;
        }
        try {
          const json = JSON.parse(xhr.responseText || "{}") as MediaItemResponse;
          if (xhr.status >= 200 && xhr.status < 300 && json?.data) {
            onProgress?.(100);
            resolve(json.data);
            return;
          }
          const message =
            (json as any)?.errors?.duration_seconds?.[0] ||
            json?.message ||
            (json as any)?.errors?.file?.[0] ||
            (json as any)?.errors?.video?.[0] ||
            `Upload failed (${xhr.status})`;
          const error = new Error(message);
          (error as any).status = xhr.status;
          (error as any).response = json;
          reject(error);
        } catch (parseError) {
          Logger.error("Failed to parse media upload response:", parseError);
          // Non-JSON 4xx = proxy body-size rejection (backend guidance)
          if (xhr.status >= 400 && xhr.status < 500) {
            reject(new VideoTooLargeError());
            return;
          }
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timed out"));
      };

      // Large videos — allow up to 10 minutes
      xhr.timeout = 10 * 60 * 1000;
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
}

export type UploadImageParams = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  sourceType: MediaUploadSourceType;
  width?: number | null;
  height?: number | null;
};

/**
 * Upload a still image as a media asset (template slots with accepted_types: image).
 * POST /api/media with multipart field `file` — no duration_seconds (MD: image support).
 * Images return status `ready` immediately.
 */
export function uploadImage(
  params: UploadImageParams,
  onProgress?: (percent: number) => void,
): Promise<MediaVideo> {
  return new Promise(async (resolve, reject) => {
    try {
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        const error = new Error("No internet connection");
        (error as any).isNoInternet = true;
        reject(error);
        return;
      }

      const accessToken = getAccessToken();
      if (!accessToken) {
        reject(new Error("Not authenticated"));
        return;
      }

      const prepared = await prepareImageForUpload(
        params.uri,
        params.fileName?.replace(/\.[^.]+$/, "") || "template_image",
      );
      const mimeType = prepared.type || "image/jpeg";
      const fileName = prepared.name || params.fileName || "photo.jpg";

      const formData = new FormData();
      formData.append("file", {
        uri: prepared.uri,
        type: mimeType,
        name: fileName,
      } as any);
      formData.append("source_type", params.sourceType);
      if (params.width != null) {
        formData.append("width", String(params.width));
      }
      if (params.height != null) {
        formData.append("height", String(params.height));
      }

      const baseUrl = BASE_URL.endsWith("/")
        ? BASE_URL.slice(0, -1)
        : BASE_URL;
      const url = `${baseUrl}${mediaEndpoints.upload}`;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("Accept", "application/json");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) return;
        const percent = Math.min(
          100,
          Math.round((event.loaded / event.total) * 100),
        );
        onProgress(percent);
      };

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText || "{}") as MediaItemResponse;
          if (xhr.status >= 200 && xhr.status < 300 && json?.data) {
            onProgress?.(100);
            resolve(json.data);
            return;
          }
          const message =
            json?.message ||
            (json as any)?.errors?.file?.[0] ||
            (json as any)?.errors?.image?.[0] ||
            (json as any)?.errors?.video?.[0] ||
            `Upload failed (${xhr.status})`;
          const error = new Error(message);
          (error as any).status = xhr.status;
          (error as any).response = json;
          reject(error);
        } catch (parseError) {
          Logger.error("Failed to parse image upload response:", parseError);
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.ontimeout = () => {
        reject(new Error("Upload timed out"));
      };

      xhr.timeout = 5 * 60 * 1000;
      xhr.send(formData);
    } catch (error) {
      reject(error);
    }
  });
}
