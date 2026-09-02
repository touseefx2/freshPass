export type DayHoursBounds = {
  isOpen: boolean;
  fromHours: number;
  fromMinutes: number;
  tillHours: number;
  tillMinutes: number;
};

export const getTotalMinutes = (hours: number, minutes: number): number =>
  hours * 60 + minutes;

/** True when closing is earlier/equal to opening (e.g. 14:00 → 03:00). */
export const isOvernightRange = (
  fromHours: number,
  fromMinutes: number,
  tillHours: number,
  tillMinutes: number,
): boolean =>
  getTotalMinutes(tillHours, tillMinutes) <=
  getTotalMinutes(fromHours, fromMinutes);

/**
 * Whether a clock time falls inside [open, close], including overnight windows.
 */
export const isTimeWithinBounds = (
  hours: number,
  minutes: number,
  openHours: number,
  openMinutes: number,
  closeHours: number,
  closeMinutes: number,
): boolean => {
  const t = getTotalMinutes(hours, minutes);
  const open = getTotalMinutes(openHours, openMinutes);
  const close = getTotalMinutes(closeHours, closeMinutes);

  if (close <= open) {
    return t >= open || t <= close;
  }
  return t >= open && t <= close;
};

/**
 * Whether a [start, end] staff window fits inside business [open, close].
 * Overnight business windows are supported.
 */
export const isWindowWithinBounds = (
  startHours: number,
  startMinutes: number,
  endHours: number,
  endMinutes: number,
  openHours: number,
  openMinutes: number,
  closeHours: number,
  closeMinutes: number,
): boolean => {
  const start = getTotalMinutes(startHours, startMinutes);
  const end = getTotalMinutes(endHours, endMinutes);
  const open = getTotalMinutes(openHours, openMinutes);
  const close = getTotalMinutes(closeHours, closeMinutes);
  const businessOvernight = close <= open;
  const staffOvernight = end <= start;

  if (!businessOvernight) {
    if (staffOvernight) return false;
    return start >= open && end <= close;
  }

  // Business overnight: staff must start on/after open and end on/before close,
  // either as overnight (start > end) or as a same-side segment.
  if (!isTimeWithinBounds(startHours, startMinutes, openHours, openMinutes, closeHours, closeMinutes)) {
    return false;
  }
  if (!isTimeWithinBounds(endHours, endMinutes, openHours, openMinutes, closeHours, closeMinutes)) {
    return false;
  }

  if (staffOvernight) {
    // Staff overnight must start in the evening portion and end in the morning portion
    return start >= open && end <= close;
  }

  // Same-calendar-day staff window inside overnight business:
  // either entirely in evening (start..end both >= open) or morning (both <= close)
  const bothEvening = start >= open && end >= open;
  const bothMorning = start <= close && end <= close;
  return bothEvening || bothMorning;
};

export const formatBoundsLabel = (
  fromHours: number,
  fromMinutes: number,
  tillHours: number,
  tillMinutes: number,
): string => {
  const formatTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${displayMinutes} ${period}`;
  };
  return `${formatTime(fromHours, fromMinutes)} – ${formatTime(tillHours, tillMinutes)}`;
};

export const getDefaultHoursFromBounds = (
  bounds?: DayHoursBounds | null,
): {
  fromHours: number;
  fromMinutes: number;
  tillHours: number;
  tillMinutes: number;
} => {
  if (bounds?.isOpen) {
    return {
      fromHours: bounds.fromHours,
      fromMinutes: bounds.fromMinutes,
      tillHours: bounds.tillHours,
      tillMinutes: bounds.tillMinutes,
    };
  }
  return {
    fromHours: 9,
    fromMinutes: 0,
    tillHours: 18,
    tillMinutes: 0,
  };
};
