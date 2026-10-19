import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type { AvailableNowStatus } from "@/src/types/availableNow";

type SalonClock = {
  /** Wall-clock time at the salon, held in a device-local Date only for formatting */
  wall: Date;
  /** Days from the salon's today (0 = today, 1 = tomorrow) */
  dayOffset: number;
  /** Real instant, for "in 45 min" */
  epochMs: number;
};

const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

/**
 * Reads "2026-10-19T15:30:00-05:00" as salon time from the string's own
 * offset — never converted to the viewer's zone.
 */
export function parseSalonTime(iso: string | null | undefined): SalonClock | null {
  if (!iso) return null;
  const m = ISO_WITH_OFFSET.exec(iso.trim());
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, tz] = m;
  let offsetMinutes = 0;
  if (tz && tz !== "Z") {
    const sign = tz.startsWith("-") ? -1 : 1;
    const digits = tz.slice(1).replace(":", "");
    offsetMinutes =
      sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4)));
  }
  const wallUtcMs = Date.UTC(+y, +mo - 1, +d, +hh, +mm, ss ? +ss : 0);
  const epochMs = wallUtcMs - offsetMinutes * 60_000;
  // Salon's "now" on the same offset, to tell today / tomorrow apart
  const salonNow = new Date(Date.now() + offsetMinutes * 60_000);
  const salonToday = Date.UTC(
    salonNow.getUTCFullYear(),
    salonNow.getUTCMonth(),
    salonNow.getUTCDate(),
  );
  const dayOffset = Math.round(
    (Date.UTC(+y, +mo - 1, +d) - salonToday) / 86_400_000,
  );
  return {
    wall: new Date(+y, +mo - 1, +d, +hh, +mm),
    dayOffset,
    epochMs,
  };
}

/** "3:30 PM", "Tomorrow 9:00 AM" or "Thu 9:00 AM" in salon time. */
export function formatSalonOpening(
  iso: string | null | undefined,
  t: TFunction,
): string | null {
  const clock = parseSalonTime(iso);
  if (!clock) return null;
  const time = dayjs(clock.wall).format("h:mm A");
  if (clock.dayOffset <= 0) return time;
  if (clock.dayOffset === 1) return t("anTomorrowAt", { time });
  return `${dayjs(clock.wall).format("ddd")} ${time}`;
}

/** "in 45 min" / "in 2 h 15 min" for a same-day opening; null otherwise. */
function formatUntil(
  status: AvailableNowStatus,
  t: TFunction,
): string | null {
  const clock = parseSalonTime(status.next_opening_at);
  if (!clock || clock.dayOffset !== 0) return null;
  // Live from the instant; the server field is only as fresh as the response
  const live = Math.ceil((clock.epochMs - Date.now()) / 60_000);
  const minutes = Number.isFinite(live)
    ? live
    : (status.minutes_until_next_opening ?? NaN);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (minutes < 60) return t("anInMinutes", { minutes });
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0
    ? t("anInHoursMinutes", { hours, minutes: rest })
    : t("anInHours", { hours });
}

export type AvailableNowBadge = {
  available: boolean;
  label: string;
};

/**
 * Badge for a reel / list row, per the backend's badge table:
 * available → "Available now" (· until 4:00 PM for a manual window);
 * unavailable with a next opening → "Next opening 3:30 PM · in 45 min";
 * unavailable with nothing in 7 days, off (incl. never switched on) or null → no badge.
 */
export function getAvailableNowBadge(
  status: AvailableNowStatus | null | undefined,
  t: TFunction,
): AvailableNowBadge | null {
  if (!status || status.status === "off") return null;
  if (status.status === "available") {
    const until = formatSalonOpening(status.window_ends_at, t);
    return {
      available: true,
      label: until
        ? t("anBadgeAvailableUntil", { time: until })
        : t("anBadgeAvailable"),
    };
  }
  const opening = formatSalonOpening(status.next_opening_at, t);
  if (!opening) return null;
  const next = t("anBadgeNextOpening", { time: opening });
  return {
    available: false,
    label: [next, formatUntil(status, t)].filter(Boolean).join(" · "),
  };
}

/** Salon-clock "HH:mm" of an ISO time, for prefilling a manual start. */
export function salonHHmm(iso: string | null | undefined): string | null {
  const clock = parseSalonTime(iso);
  return clock ? dayjs(clock.wall).format("HH:mm") : null;
}

/** Minutes since midnight on the salon's clock now; null when the device can't format the zone. */
export function salonNowMinutes(timeZone: string | null | undefined): number | null {
  if (!timeZone) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const hours = Number(parts.find((p) => p.type === "hour")?.value);
    const minutes = Number(parts.find((p) => p.type === "minute")?.value);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return (hours % 24) * 60 + minutes;
  } catch {
    return null;
  }
}
