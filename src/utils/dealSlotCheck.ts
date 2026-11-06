/**
 * Why a calendar-tapped time can't take a deal, in words the owner gets:
 * passed / salon closed / outside hours / barber off / break / runs past close.
 * Pure — all times are salon clock "HH:mm".
 */
import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type {
  DayHours,
  OwnerBusinessHours,
} from "@/src/services/ownerBookingService";
import type { SalonWall } from "@/src/utils/salonTimezone";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** "21:30" → "9:30 PM" */
export function formatSlotTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export type SlotCheckInput = {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  hours: OwnerBusinessHours | null;
  now: SalonWall;
  staffId?: number | null;
  staffName?: string | null;
  /** Leave out before a service is picked (calendar check) */
  serviceName?: string | null;
  durationMinutes?: number | null;
};

/** The reason in plain words, or null when hours alone don't explain it. */
export function slotProblem(input: SlotCheckInput, t: TFunction): string | null {
  const { date, time, hours, now, staffId, staffName } = input;
  const start = toMin(time);
  const timeLabel = formatSlotTime(time);
  const dayLabel = dayjs(date).format("ddd, MMM D");

  if (date < now.day || (date === now.day && start <= now.minutes)) {
    return t("sdSlotPassed", { time: timeLabel });
  }

  const weekday = dayjs(date).format("dddd").toLowerCase();
  const dur = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : 0;
  const end = start + dur;

  const check = (row: DayHours | undefined, who: "salon" | "staff"): string | null => {
    if (!row) return null;
    const name = staffName || "";
    if (row.closed || !row.open || !row.close) {
      return who === "salon"
        ? t("sdSlotSalonClosedDay", { day: dayLabel })
        : t("sdSlotStaffOffDay", { name, day: dayLabel });
    }
    const open = toMin(row.open);
    const close = toMin(row.close);
    const range = { open: formatSlotTime(row.open), close: formatSlotTime(row.close) };
    if (start < open || start >= close) {
      return who === "salon"
        ? t("sdSlotOutsideHours", { ...range, day: dayLabel, time: timeLabel })
        : t("sdSlotStaffOutsideHours", { ...range, name, day: dayLabel, time: timeLabel });
    }
    for (const b of row.breaks) {
      const bs = toMin(b.start);
      const be = toMin(b.end);
      if (start >= bs && start < be) {
        return t("sdSlotInBreak", {
          time: timeLabel,
          start: formatSlotTime(b.start),
          end: formatSlotTime(b.end),
        });
      }
      if (dur && start < bs && end > bs) {
        return t("sdSlotEndsInBreak", {
          service: input.serviceName || "",
          mins: dur,
          start: formatSlotTime(b.start),
        });
      }
    }
    if (dur && end > close) {
      return t("sdSlotEndsAfterClose", {
        service: input.serviceName || "",
        mins: dur,
        close: range.close,
      });
    }
    return null;
  };

  const salonReason = check(hours?.hours[weekday], "salon");
  if (salonReason) return salonReason;
  if (staffId != null && hours?.staffHours[staffId]) {
    const staffReason = check(hours.staffHours[staffId][weekday], "staff");
    if (staffReason) return staffReason;
  }
  return null;
}
