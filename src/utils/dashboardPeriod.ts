import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { EarningsPeriodQuery } from "@/src/types/businessEarnings";

dayjs.extend(customParseFormat);

/**
 * Period tabs on the business home + Transactions screens.
 * Today / This Week send from_date + to_date, This Month sends month,
 * the calendar icon sends a custom from_date + to_date.
 */
export type DashboardPeriodKey = "today" | "week" | "month" | "custom";

export interface DashboardPeriod {
  key: DashboardPeriodKey;
  /** YYYY-MM-DD, inclusive */
  from: string;
  /** YYYY-MM-DD, inclusive */
  to: string;
}

const DATE_FORMAT = "YYYY-MM-DD";

/** Echoed by GET /business/earnings in period.timezone; null until the first response. */
let businessTimezone: string | null = null;

/** Returns true when the zone changed (callers rebuild their period). */
export function setBusinessTimezone(timezone: string | null | undefined): boolean {
  if (!timezone || timezone === businessTimezone) return false;
  businessTimezone = timezone;
  return true;
}

/** "Today" in the business's timezone; the device's until the server tells us. */
export function businessToday(): dayjs.Dayjs {
  if (businessTimezone) {
    try {
      // en-CA formats as YYYY-MM-DD
      const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: businessTimezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      const parsed = dayjs(ymd, DATE_FORMAT);
      if (parsed.isValid()) return parsed;
    } catch {
      // Unknown zone or no Intl time zone data — fall back to the device
    }
  }
  return dayjs().startOf("day");
}

export function buildPeriod(
  key: DashboardPeriodKey,
  custom?: { from: string; to: string } | null,
): DashboardPeriod {
  const today = businessToday();
  switch (key) {
    case "week": {
      // Monday → Sunday
      const monday = today.subtract((today.day() + 6) % 7, "day");
      return {
        key,
        from: monday.format(DATE_FORMAT),
        to: monday.add(6, "day").format(DATE_FORMAT),
      };
    }
    case "month":
      return {
        key,
        from: today.startOf("month").format(DATE_FORMAT),
        to: today.endOf("month").format(DATE_FORMAT),
      };
    case "custom":
      if (custom?.from && custom?.to) {
        const [from, to] =
          custom.from <= custom.to
            ? [custom.from, custom.to]
            : [custom.to, custom.from];
        return { key, from, to };
      }
      return buildPeriod("today");
    case "today":
    default: {
      const day = today.format(DATE_FORMAT);
      return { key: "today", from: day, to: day };
    }
  }
}

export function isSameDashboardPeriod(
  a: DashboardPeriod,
  b: DashboardPeriod,
): boolean {
  return a.key === b.key && a.from === b.from && a.to === b.to;
}

export function isSingleDayPeriod(period: DashboardPeriod): boolean {
  return period.from === period.to;
}

/** For /business/earnings* and /dashboard/stats. Never month + dates together. */
export function periodApiQuery(period: DashboardPeriod): EarningsPeriodQuery {
  if (period.key === "month") {
    return { month: period.from.slice(0, 7) };
  }
  return { from_date: period.from, to_date: period.to };
}

/** For /appointments (always explicit dates, also for a month). */
export function periodAppointmentsQuery(period: DashboardPeriod) {
  return {
    appointment_from_date: period.from,
    appointment_to_date: period.to,
  };
}

/** Route params so a pushed screen opens on the same tab. */
export function periodToParams(period: DashboardPeriod) {
  return { period: period.key, from: period.from, to: period.to };
}

export function periodFromParams(params: {
  period?: string | string[];
  from?: string | string[];
  to?: string | string[];
}): DashboardPeriod {
  const pick = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  const key = pick(params.period);
  const from = pick(params.from);
  const to = pick(params.to);
  if (key === "today" || key === "week" || key === "month") {
    return buildPeriod(key);
  }
  if (
    key === "custom" &&
    from &&
    to &&
    dayjs(from, DATE_FORMAT, true).isValid() &&
    dayjs(to, DATE_FORMAT, true).isValid()
  ) {
    return buildPeriod("custom", { from, to });
  }
  return buildPeriod("today");
}

/** "Oct 13 – Oct 19" (adds the year when the range leaves this year). */
export function formatPeriodRange(period: DashboardPeriod): string {
  const from = dayjs(period.from, DATE_FORMAT);
  const to = dayjs(period.to, DATE_FORMAT);
  const thisYear = businessToday().year();
  const withYear = from.year() !== thisYear || to.year() !== thisYear;
  const fmt = withYear ? "MMM D, YYYY" : "MMM D";
  if (period.from === period.to) return from.format(fmt);
  return `${from.format(fmt)} – ${to.format(fmt)}`;
}
