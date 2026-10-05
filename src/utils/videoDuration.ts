import { createVideoPlayer } from "expo-video";
import Logger from "@/src/services/logger";

/**
 * Reads a local video's length (seconds) when the picker didn't report one —
 * some Android gallery items come back with `duration: null`.
 * Resolves null if it can't be read within `timeoutMs`.
 */
export function measureVideoDurationSeconds(
  uri: string,
  timeoutMs = 6000,
): Promise<number | null> {
  return new Promise((resolve) => {
    let settled = false;
    let player: ReturnType<typeof createVideoPlayer> | null = null;
    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        player?.release();
      } catch {}
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      player = createVideoPlayer(uri);
      player.muted = true;
      player.addListener("sourceLoad", ({ duration }) => {
        finish(Number.isFinite(duration) && duration > 0 ? duration : null);
      });
      player.addListener("statusChange", ({ status }) => {
        if (status === "readyToPlay" && player && player.duration > 0) {
          finish(player.duration);
        } else if (status === "error") {
          finish(null);
        }
      });
    } catch (error) {
      Logger.warn("Could not measure video duration:", error);
      finish(null);
    }
  });
}
