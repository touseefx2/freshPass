import AsyncStorage from "@react-native-async-storage/async-storage";
import { getReelTryOnStatus } from "@/src/services/reelsService";
import type { ReelTryOnStatusResponse } from "@/src/types/reels";
import Logger from "@/src/services/logger";

const STORAGE_KEY = "reel_tryon_pending_job";
const FIRST_POLL_MS = 3500;
const POLL_INTERVAL_MS = 6000;
const MAX_POLL_MS = 20 * 60 * 1000;

export type PendingReelTryOn = {
  jobId: string;
  reelId: number;
  prompt?: string | null;
  estimatedMinutes?: number;
  imageUri?: string | null;
  startedAt: number;
};

export async function savePendingReelTryOn(
  pending: PendingReelTryOn,
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch (error) {
    Logger.error("Failed to persist reel try-on job:", error);
  }
}

export async function loadPendingReelTryOn(): Promise<PendingReelTryOn | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingReelTryOn;
  } catch {
    return null;
  }
}

export async function clearPendingReelTryOn(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * Poll GET /api/try-ons/{job_id}: first check ~3.5s, then every ~6s, up to 20 min.
 * Returns when completed/failed, or null if cancelled / timed out.
 */
export function pollReelTryOnJob(
  jobId: string,
  options?: {
    signal?: { cancelled: boolean };
    onTick?: (status: ReelTryOnStatusResponse) => void;
  },
): Promise<ReelTryOnStatusResponse | null> {
  const started = Date.now();
  const signal = options?.signal;

  return new Promise((resolve) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = (result: ReelTryOnStatusResponse | null) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve(result);
    };

    const schedule = (delay: number) => {
      timeoutId = setTimeout(async () => {
        if (signal?.cancelled) {
          finish(null);
          return;
        }
        if (Date.now() - started > MAX_POLL_MS) {
          finish(null);
          return;
        }
        try {
          const status = await getReelTryOnStatus(jobId);
          options?.onTick?.(status);
          if (status.status === "completed" || status.status === "failed") {
            finish(status);
            return;
          }
        } catch (error: any) {
          const code = error?.status ?? error?.response?.status;
          if (code === 422 || code === 404) {
            finish(null);
            return;
          }
          Logger.error("Reel try-on poll error:", error);
        }
        if (signal?.cancelled) {
          finish(null);
          return;
        }
        schedule(POLL_INTERVAL_MS);
      }, delay);
    };

    schedule(FIRST_POLL_MS);
  });
}
