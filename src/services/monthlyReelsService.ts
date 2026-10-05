import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import { getMediaLimits } from "@/src/services/mediaLibraryService";
import type { MediaLimits, StaffReelLimit } from "@/src/types/media";

/** Whole business shares this many reels a month (owner + staff). */
export const BUSINESS_REELS_PER_MONTH = 12;

/** Fresh limits — the monthly counters change with every reel, so never use the cache. */
export function fetchMonthlyReelLimits(): Promise<MediaLimits> {
  return getMediaLimits({ force: true });
}

export function findStaffReelLimit(
  limits: MediaLimits | null | undefined,
  staffId: number | string | null | undefined,
): StaffReelLimit | null {
  if (!limits?.staff_reel_limits || staffId == null) return null;
  return (
    limits.staff_reel_limits.find(
      (row) => String(row.staff_id) === String(staffId),
    ) ?? null
  );
}

/**
 * Most the owner can give this staff member: what's still unassigned plus
 * what they already have (it is freed when the number changes).
 */
export function maxAssignableForStaff(
  limits: MediaLimits | null | undefined,
  currentLimit: number | null | undefined,
): number {
  const max = limits?.max_reels_per_month ?? BUSINESS_REELS_PER_MONTH;
  const unassigned = limits?.unassigned;
  if (typeof unassigned !== "number") return max;
  return Math.max(0, Math.min(max, unassigned + (currentLimit ?? 0)));
}

/**
 * Owner only — PUT /api/staff/{staff} with monthly_reel_limit (0–12 or null).
 * 422 on monthly_reel_limit when staff together would exceed 12.
 */
export async function setStaffMonthlyReelLimit(
  staffId: number | string,
  monthlyReelLimit: number | null,
): Promise<void> {
  await ApiService.put(
    staffEndpoints.update(staffId),
    { monthly_reel_limit: monthlyReelLimit },
    { headers: { "Content-Type": "application/json" } },
  );
}

/** "2026-11-01" → localized short date, e.g. "Nov 1" */
export function formatReelsResetDate(
  value: string | null | undefined,
  locale?: string,
): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  try {
    return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
  } catch {
    return `${match[2]}/${match[3]}`;
  }
}

/**
 * Message to show before starting a reel when this user has none left this
 * month (mirrors the server's 422 `reel` wording). null = they can post.
 */
export function monthlyReelsBlockedMessage(
  limits: MediaLimits | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
  locale?: string,
): string | null {
  if (!limits || typeof limits.reels_remaining_this_month !== "number") {
    return null;
  }
  if (limits.reels_remaining_this_month > 0) return null;

  const date =
    formatReelsResetDate(limits.monthly_reels_reset_on, locale) ||
    t("monthlyReelsNextMonth");
  const max = limits.max_reels_per_month ?? BUSINESS_REELS_PER_MONTH;
  const yourLimit = limits.your_monthly_reel_limit ?? 0;

  if (
    typeof limits.business_reels_remaining_this_month === "number" &&
    limits.business_reels_remaining_this_month <= 0
  ) {
    return t("monthlyReelsBusinessUsedAll", { max, date });
  }
  if (limits.monthly_reel_role === "staff") {
    return yourLimit <= 0
      ? t("monthlyReelsStaffNoneGiven")
      : t("monthlyReelsStaffUsedAll", { limit: yourLimit, date });
  }
  if (limits.monthly_reel_role === "owner") {
    return t("monthlyReelsOwnerUsedUnassigned", { limit: yourLimit, date });
  }
  return t("monthlyReelsBusinessUsedAll", { max, date });
}
