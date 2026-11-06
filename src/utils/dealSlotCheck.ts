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
import type { SlotOffer } from "@/src/types/slotOffer";

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

export type SlotProblemKind =
  | "passed"
  | "closedDay"
  | "outsideHours"
  | "staffOff"
  | "staffOutsideHours"
  | "break"
  | "serviceTooLong";

export type SlotProblem = {
  kind: SlotProblemKind;
  /** Short title for the popup */
  title: string;
  /** One sentence: why */
  message: string;
  /** Whose hours explain it (null for "passed") */
  hoursOf: { who: "salon" | "staff"; name: string | null; day: DayHours } | null;
  /** "Friday" */
  dayName: string;
};

/** Full reason for the popup, or null when hours alone don't explain it. */
export function checkSlot(input: SlotCheckInput, t: TFunction): SlotProblem | null {
  const { date, time, hours, now, staffId, staffName } = input;
  const start = toMin(time);
  const dayName = dayjs(date).format("dddd");

  if (date < now.day || (date === now.day && start <= now.minutes)) {
    return {
      kind: "passed",
      title: t("sdBlockPassedTitle"),
      message: t("sdSlotPassed"),
      hoursOf: null,
      dayName,
    };
  }

  const weekday = dayjs(date).format("dddd").toLowerCase();
  // dayjs may be in another locale; hours are keyed by English day names
  const enWeekday = dayjs(date).locale("en").format("dddd").toLowerCase() || weekday;
  const dur = input.durationMinutes && input.durationMinutes > 0 ? input.durationMinutes : 0;
  const end = start + dur;

  const check = (row: DayHours | undefined, who: "salon" | "staff"): SlotProblem | null => {
    if (!row) return null;
    const name = staffName || "";
    const hoursOf = { who, name: who === "staff" ? name : null, day: row };
    const make = (kind: SlotProblemKind, title: string, message: string): SlotProblem => ({
      kind,
      title,
      message,
      hoursOf,
      dayName,
    });
    if (row.closed || !row.open || !row.close) {
      return who === "salon"
        ? make("closedDay", t("sdBlockClosedTitle"), t("sdSlotSalonClosedDay", { day: dayName }))
        : make("staffOff", t("sdBlockStaffTitle", { name }), t("sdSlotStaffOffDay", { name, day: dayName }));
    }
    const open = toMin(row.open);
    const close = toMin(row.close);
    if (start < open || start >= close) {
      if (who === "staff") {
        return make(
          "staffOutsideHours",
          t("sdBlockStaffTitle", { name }),
          t("sdSlotStaffOutsideHours", {
            name,
            day: dayName,
            open: formatSlotTime(row.open),
            close: formatSlotTime(row.close),
          }),
        );
      }
      return make(
        "outsideHours",
        t("sdBlockOutsideTitle"),
        start < open
          ? t("sdSlotBeforeOpen", { open: formatSlotTime(row.open), day: dayName })
          : t("sdSlotAfterClose", { close: formatSlotTime(row.close), day: dayName }),
      );
    }
    for (const b of row.breaks) {
      const bs = toMin(b.start);
      const be = toMin(b.end);
      if (start >= bs && start < be) {
        return make(
          "break",
          t("sdBlockBreakTitle"),
          t("sdSlotInBreak", {
            start: formatSlotTime(b.start),
            end: formatSlotTime(b.end),
          }),
        );
      }
      if (dur && start < bs && end > bs) {
        return make(
          "serviceTooLong",
          t("sdBlockServiceTitle"),
          t("sdSlotEndsInBreak", {
            service: input.serviceName || "",
            mins: dur,
            start: formatSlotTime(b.start),
          }),
        );
      }
    }
    if (dur && end > close) {
      return make(
        "serviceTooLong",
        t("sdBlockServiceTitle"),
        t("sdSlotEndsAfterClose", {
          service: input.serviceName || "",
          mins: dur,
          close: formatSlotTime(row.close),
        }),
      );
    }
    return null;
  };

  const salonRow = hours?.hours[enWeekday] ?? hours?.hours[weekday];
  const salonReason = check(salonRow, "salon");
  if (salonReason) return salonReason;
  if (staffId != null && hours?.staffHours[staffId]) {
    const rows = hours.staffHours[staffId];
    const staffReason = check(rows[enWeekday] ?? rows[weekday], "staff");
    if (staffReason) return staffReason;
  }
  return null;
}

/** Live or paused deals hold their slot; booked ones are already appointments. */
export function isActiveDeal(deal: Pick<SlotOffer, "status">): boolean {
  return deal.status === "live" || deal.status === "paused";
}

/** Deal's slot as salon-clock minutes [start, end). */
export function dealMinutes(deal: Pick<SlotOffer, "start_time" | "duration_minutes">) {
  const start = toMin(deal.start_time.slice(0, 5));
  return { start, end: start + Math.max(deal.duration_minutes || 0, 1) };
}

/**
 * The active deal a new deal at `time` (lasting `durationMinutes`) would
 * overlap for this barber on this day, if any.
 */
export function overlappingDeal(
  deals: SlotOffer[],
  date: string,
  time: string,
  durationMinutes: number,
  staffId?: number | null,
): SlotOffer | null {
  const start = toMin(time);
  const end = start + Math.max(durationMinutes, 1);
  return (
    deals.find((deal) => {
      if (deal.date !== date || !isActiveDeal(deal)) return false;
      if (staffId != null && deal.staff && deal.staff.id !== staffId) return false;
      const d = dealMinutes(deal);
      return start < d.end && end > d.start;
    }) ?? null
  );
}

/** Just the sentence (Post a Deal time-step box). */
export function slotProblem(input: SlotCheckInput, t: TFunction): string | null {
  return checkSlot(input, t)?.message ?? null;
}
