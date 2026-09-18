import { ApiService, checkInternetConnection } from "@/src/services/api";
import { mediaEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";
import type {
  MediaDeleteResponse,
  MediaItemResponse,
  MediaListMeta,
  MediaListResponse,
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

export type UploadVideoParams = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  sourceType: MediaUploadSourceType;
};

/**
 * Upload a video with real byte progress via XMLHttpRequest.
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

      const mimeType = guessMimeType(params.uri, params.mimeType);
      const fileName =
        params.fileName || guessFileName(params.uri, mimeType);

      const formData = new FormData();
      formData.append("video", {
        uri: params.uri,
        type: mimeType,
        name: fileName,
      } as any);
      formData.append("source_type", params.sourceType);

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
            (json as any)?.errors?.video?.[0] ||
            `Upload failed (${xhr.status})`;
          const error = new Error(message);
          (error as any).status = xhr.status;
          (error as any).response = json;
          reject(error);
        } catch (parseError) {
          Logger.error("Failed to parse media upload response:", parseError);
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
