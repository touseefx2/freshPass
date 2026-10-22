import dayjs from "dayjs";

/** Phone's IANA zone ("America/Chicago"); undefined on old Android builds that can't tell. */
export function getDeviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * "America/Chicago (CDT)" for the salon's zone. Slot times are salon clock
 * times, so the booking screens label them with this, not the customer's zone.
 * Falls back to just the zone name when the device can't format other zones.
 */
export function formatSalonTimeZone(timeZone: string): string {
  try {
    const offsetName = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return offsetName ? `${timeZone} (${offsetName})` : timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Salon's clock as sent with `/api/available-slots`: its wall time at `now`
 * (kept as UTC ms of those wall fields) and the phone time it arrived at.
 */
export type SalonClock = { wallMs: number; phoneMs: number };

/** `now` like "2026-10-22T13:05:00-04:00" → clock; null when missing or bad. */
export function parseSalonClock(now: unknown): SalonClock | null {
  if (typeof now !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(:\d{2})?/.exec(now);
  if (!match) return null;
  const wallMs = Date.parse(`${match[1]}${match[2] ?? ":00"}Z`);
  return Number.isNaN(wallMs) ? null : { wallMs, phoneMs: Date.now() };
}

/** Salon's wall time from its zone on the phone; null if the phone can't. */
function wallMsInZone(timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value);
    const wallMs = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return Number.isNaN(wallMs) ? null : wallMs;
  } catch {
    return null;
  }
}

/**
 * The salon's current time as a local dayjs whose date, hour and minute are
 * the salon's, so it compares directly with picked dates and slot times.
 * Server `now` plus the phone time passed since (the phone's zone and a wrong
 * phone clock don't matter), else the salon zone, else the phone clock.
 */
export function salonNow(
  clock: SalonClock | null,
  timeZone?: string | null,
): dayjs.Dayjs {
  const wallMs = clock
    ? clock.wallMs + (Date.now() - clock.phoneMs)
    : timeZone
      ? wallMsInZone(timeZone)
      : null;
  if (wallMs == null) return dayjs();
  const d = new Date(wallMs);
  return dayjs(
    new Date(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
    ),
  );
}

/** Has this slot ("HH:mm") on this salon day already started? */
export function salonSlotHasPassed(
  date: dayjs.Dayjs,
  slot: string,
  now: dayjs.Dayjs,
): boolean {
  if (date.isBefore(now, "day")) return true;
  if (!date.isSame(now, "day")) return false;
  const [h, m] = slot.split(":").map(Number);
  return !date.hour(h).minute(m).second(0).millisecond(0).isAfter(now);
}

/**
 * A booking refused for its time (422 on `appointment_time`, or a past
 * `appointment_date`): the message to show, else null.
 */
export function bookingTimeError(error: unknown): string | null {
  const errors = (error as { data?: { errors?: Record<string, unknown> } })
    ?.data?.errors;
  for (const key of ["appointment_time", "appointment_date"]) {
    const list = errors?.[key];
    const first = Array.isArray(list) ? list[0] : list;
    if (typeof first === "string" && first) return first;
  }
  return null;
}

/** Zones an owner can pick in Location settings (US only, per backend). */
export const US_TIME_ZONES: { zone: string; label: string }[] = [
  { zone: "America/New_York", label: "Eastern Time (New York)" },
  { zone: "America/Chicago", label: "Central Time (Chicago)" },
  { zone: "America/Denver", label: "Mountain Time (Denver)" },
  { zone: "America/Phoenix", label: "Mountain Time, no DST (Phoenix)" },
  { zone: "America/Los_Angeles", label: "Pacific Time (Los Angeles)" },
  { zone: "America/Anchorage", label: "Alaska Time (Anchorage)" },
  { zone: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)" },
];

/** "Central Time (Chicago)" for a US zone, else "Asia/Karachi (PKT)". */
export function timeZoneLabel(zone: string): string {
  return (
    US_TIME_ZONES.find((z) => z.zone === zone)?.label ??
    formatSalonTimeZone(zone)
  );
}
