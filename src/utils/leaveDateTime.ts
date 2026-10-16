import dayjs from "dayjs";

export type LeaveType = "leave" | "break";

/** Shared leave shape after the date/time field split. */
export interface LeaveRecord {
  id: number;
  user_id?: number;
  staff_id?: number;
  staff_name: string | null;
  type: LeaveType;
  start_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm:ss, null for full-day leave
  end_date: string;
  end_time: string | null;
  reason: string | null;
  created_at: string;
  /** Owner time off that closes the whole business (older backends omit it). */
  closes_business?: boolean;
}

/**
 * Translation key for a leave's badge. Owner time off says whether the whole
 * business is closed or only the owner is off. Staff leaves and older payloads
 * (no `closes_business`) keep the plain Close / Break labels.
 */
export const leaveBadgeLabelKey = (
  leave: Pick<LeaveRecord, "type" | "closes_business">,
  isOwner: boolean,
): string => {
  if (leave.closes_business === true) return "tOffBusinessClosedUpper";
  if (isOwner && leave.closes_business === false && leave.type === "leave") {
    return "tOffOwnerOffUpper";
  }
  return leave.type === "break" ? "breakUpper" : "closeUpper";
};

/** Closures first, so a day with both a closure and owner time off reads as closed. */
export const sortClosuresFirst = <T extends Pick<LeaveRecord, "closes_business">>(
  leaves: T[],
): T[] =>
  [...leaves].sort(
    (a, b) => Number(b.closes_business === true) - Number(a.closes_business === true),
  );

/** Picker hours/minutes → API `HH:mm:ss` (24-hour, zero-padded). */
export const toApiTime = (hours: number, minutes: number): string =>
  `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

/** `HH:mm:ss` (or null) → minutes past midnight. null = whole-day fallback. */
export const timeToMinutes = (
  time: string | null | undefined,
  fallback: number,
): number => {
  if (!time) return fallback;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  return h * 60 + m;
};

export const leaveCoversDay = (
  leave: Pick<LeaveRecord, "start_date" | "end_date">,
  dayKey: string,
): boolean => dayKey >= leave.start_date && dayKey <= leave.end_date;

export const formatLeaveDateDisplay = (
  dateStr: string,
  alwaysShowYear = false,
): string => {
  if (!dateStr) return "—";
  const d = dayjs(dateStr);
  if (!d.isValid()) return dateStr;
  const showYear = alwaysShowYear || d.year() !== dayjs().year();
  return d.format(showYear ? "MMM D, YYYY" : "MMM D");
};

/** Display-only 12h label from API `HH:mm:ss`. */
export const formatLeaveTimeDisplay = (
  timeStr: string | null | undefined,
): string => {
  if (!timeStr) return "—";
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr.slice(0, 5);
  const period = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${period}`;
};

export const formatLeaveDateTimeDisplay = (
  dateStr: string,
  timeStr: string | null | undefined,
): string => {
  if (!timeStr) return formatLeaveDateDisplay(dateStr, true);
  return `${formatLeaveDateDisplay(dateStr, true)} · ${formatLeaveTimeDisplay(timeStr)}`;
};

/** Card / list label for a leave or break. */
export const formatLeaveRangeDisplay = (leave: {
  type: LeaveType;
  start_date: string;
  start_time: string | null;
  end_date: string;
  end_time: string | null;
}): string => {
  if (leave.type === "leave") {
    if (leave.start_date === leave.end_date) {
      return formatLeaveDateDisplay(leave.start_date, true);
    }
    return `${formatLeaveDateDisplay(leave.start_date, true)} – ${formatLeaveDateDisplay(leave.end_date, true)}`;
  }
  if (leave.start_date === leave.end_date) {
    return `${formatLeaveDateTimeDisplay(leave.start_date, leave.start_time)} – ${formatLeaveTimeDisplay(leave.end_time)}`;
  }
  return `${formatLeaveDateTimeDisplay(leave.start_date, leave.start_time)} – ${formatLeaveDateTimeDisplay(leave.end_date, leave.end_time)}`;
};
