import type { MediaLimits } from "@/src/types/media";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type ReelEstimateItem = {
  type: "image" | "video";
  durationMs?: number;
};

/** User-facing length rule from GET /api/media/limits. */
export function formatReelLimitMessage(
  limits: MediaLimits,
  t: TranslateFn,
): string {
  const base = t("reelLimitMaxSeconds", { max_seconds: limits.max_seconds });
  if (limits.has_extended) return base;
  const goal = t("reelLimitExtendedGoal", {
    extended_at_followers: limits.extended_at_followers,
    extended_max_seconds: limits.extended_max_seconds,
  });
  return `${base} ${goal}`;
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
