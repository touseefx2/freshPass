// Small helpers for the owner Profile Promotions screens. Prices and
// eligibility always come from the server; nothing here calculates a price.

import type { TFunction } from "i18next";
import { salonNow } from "@/src/utils/salonTimezone";
import type { ClassBadgeTone } from "@/src/utils/masterClassHelpers";
import type { PromotionStatus } from "@/src/types/promotion";

/**
 * `booking_starts_at` for a new offer: "now" on the salon clock as
 * "YYYY-MM-DD HH:mm". The design only has "Book by", so offers open at once.
 * If the backend makes the field optional, return null here and stop sending it.
 */
export function promotionBookingStartNow(timeZone?: string | null): string | null {
  const now = salonNow(null, timeZone);
  const h = Math.floor(now.minutes / 60);
  const m = now.minutes % 60;
  return `${now.day} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "2026-11-20 09:00" / "2026-11-20T09:00:00" → { date, time } (salon wall clock). */
export function splitServerDateTime(value: string | null | undefined): {
  date: string | null;
  time: string | null;
} {
  if (!value) return { date: null, time: null };
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(value);
  return match
    ? { date: match[1], time: match[2] ?? null }
    : { date: null, time: null };
}

/** "09:00:00" → "09:00" */
export function toHHmm(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

/** App weekday chips are ISO (1 = Mon … 7 = Sun); the API is 0 = Sun … 6 = Sat. */
export const isoToApiWeekday = (iso: number): number => (iso === 7 ? 0 : iso);
export const apiToIsoWeekday = (day: number): number => (day === 0 ? 7 : day);

export function formatPromotionMoney(n: number | null | undefined): string {
  const v = Number(n) || 0;
  return Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`;
}

export function promotionStatusMeta(
  status: PromotionStatus,
  t: TFunction,
): { label: string; tone: ClassBadgeTone } {
  switch (status) {
    case "active":
      return { label: t("proStatusActive"), tone: "live" };
    case "paused":
      return { label: t("proStatusPaused"), tone: "warning" };
    case "draft":
      return { label: t("proStatusDraft"), tone: "draft" };
    case "suspended":
      return { label: t("proStatusSuspended"), tone: "danger" };
    default: {
      // Any other server status ("ended", "scheduled" …): show it as sent
      const text = String(status || "").replace(/_/g, " ");
      return {
        label: text ? text.charAt(0).toUpperCase() + text.slice(1) : "",
        tone: "neutral",
      };
    }
  }
}
