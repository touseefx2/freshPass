import * as VideoThumbnails from "expo-video-thumbnails";
import Logger from "@/src/services/logger";

const thumbnailCache = new Map<number, string>();
const MAX_CONCURRENT = 3;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

function runNext(): void {
  if (activeCount >= MAX_CONCURRENT) return;
  const next = waitQueue.shift();
  if (!next) return;
  activeCount += 1;
  next();
}

function releaseSlot(): void {
  activeCount = Math.max(0, activeCount - 1);
  runNext();
}

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    waitQueue.push(() => resolve());
    runNext();
  });
}

export function getCachedVideoThumbnail(videoId: number): string | undefined {
  return thumbnailCache.get(videoId);
}

export function setCachedVideoThumbnail(
  videoId: number,
  uri: string,
): void {
  thumbnailCache.set(videoId, uri);
}

/**
 * Lazily extract first frame from playback_url. Cached per video id.
 * Concurrency capped so fast scrolls don't fire dozens of extractions.
 */
export async function extractVideoThumbnail(
  videoId: number,
  playbackUrl: string,
): Promise<string | null> {
  const cached = thumbnailCache.get(videoId);
  if (cached) return cached;

  if (!playbackUrl?.trim()) return null;

  await acquireSlot();
  try {
    const again = thumbnailCache.get(videoId);
    if (again) return again;

    const result = await VideoThumbnails.getThumbnailAsync(playbackUrl, {
      time: 0,
      quality: 0.6,
    });
    if (result?.uri) {
      thumbnailCache.set(videoId, result.uri);
      return result.uri;
    }
    return null;
  } catch (error) {
    Logger.error(`Failed to extract thumbnail for video ${videoId}:`, error);
    return null;
  } finally {
    releaseSlot();
  }
}

const localUriThumbCache = new Map<string, string>();

/**
 * Extract a still frame from a local (or remote) video URI for grid previews.
 * Cached by URI so Generate Reel / pickers don't re-extract the same file.
 */
export async function extractLocalVideoThumbnail(
  uri: string,
): Promise<string | null> {
  if (!uri?.trim()) return null;

  const cached = localUriThumbCache.get(uri);
  if (cached) return cached;

  await acquireSlot();
  try {
    const again = localUriThumbCache.get(uri);
    if (again) return again;

    const result = await VideoThumbnails.getThumbnailAsync(uri, {
      time: 0,
      quality: 0.7,
    });
    if (result?.uri) {
      localUriThumbCache.set(uri, result.uri);
      return result.uri;
    }
    return null;
  } catch (error) {
    Logger.error("Failed to extract local video thumbnail:", error);
    return null;
  } finally {
    releaseSlot();
  }
}
