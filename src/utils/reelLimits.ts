import type { MediaLimits } from "@/src/types/media";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type ReelEstimateItem = {
  type: "image" | "video";
  durationMs?: number;
};

/** Shortest video allowed on Next (normal reel) / Save (auto reel) in the editor. */
export const MIN_REEL_SECONDS = 3;

/** Defaults when GET /api/media/limits has not resolved or failed. */
export const REEL_LIMIT_FALLBACK = {
  max_seconds: 30,
  upload_max_seconds: 60,
  ai_max_images: 12,
} as const;

/** Upload a Reel limit; older servers only send max_seconds. */
export function uploadMaxSeconds(limits?: MediaLimits | null): number {
  return (
    limits?.upload_max_seconds ??
    limits?.max_seconds ??
    REEL_LIMIT_FALLBACK.upload_max_seconds
  );
}

/** User-facing length rule from GET /api/media/limits. */
export function formatReelLimitMessage(
  limits: MediaLimits,
  t: TranslateFn,
): string {
  return t("reelLimitMaxSeconds", { max_seconds: uploadMaxSeconds(limits) });
}

/**
 * AI Generate Reel duration estimate (same formula as the app guide).
 * Images: ai_seconds_per_image each; clips: min(duration, ai_max_seconds_per_clip);
 * transitions overlap by ai_transition_seconds.
 */
export function estimateReelSeconds(
  items: ReelEstimateItem[],
  limits: Pick<
    MediaLimits,
    | "ai_seconds_per_image"
    | "ai_max_seconds_per_clip"
    | "ai_transition_seconds"
  >,
): number {
  const body = items.reduce(
    (sum, it) =>
      sum +
      (it.type === "image"
        ? limits.ai_seconds_per_image
        : Math.min(
            (it.durationMs ?? 0) / 1000,
            limits.ai_max_seconds_per_clip,
          )),
    0,
  );
  const transitions =
    Math.max(items.length - 1, 0) * limits.ai_transition_seconds;
  return Math.round((body - transitions) * 10) / 10;
}

/** How many image-slots to remove so estimate fits under max_seconds. */
export function itemsToRemoveHint(
  estimate: number,
  maxSeconds: number,
  aiSecondsPerImage: number,
): number {
  if (estimate <= maxSeconds || aiSecondsPerImage <= 0) return 0;
  return Math.ceil((estimate - maxSeconds) / aiSecondsPerImage);
}
