import dayjs from "dayjs";
import i18n from "i18next";
import { salonNow, salonSlotHasPassed } from "@/src/utils/salonTimezone";
import type { Theme } from "@/src/theme/colors";
import type {
  CancellationWindowHours,
  ClassEnrollment,
  ClassEnrollmentFilter,
  ClassEnrollmentStatus,
  ClassListing,
  MasterClass,
  MasterClassBusinessCategory,
  MasterClassFormat,
  MasterClassStatus,
  MasterClassTab,
  MasterClassType,
} from "@/src/types/masterClass";

const tr = (key: string, options?: Record<string, unknown>): string =>
  i18n.isInitialized ? String(i18n.t(key, options as any)) : key;

// ── Options ─────────────────────────────────────────────────────────

export const CLASS_TYPE_OPTIONS: { value: MasterClassType; labelKey: string }[] =
  [
    { value: "masterclass", labelKey: "mcTypeMasterclass" },
    { value: "workshop", labelKey: "mcTypeWorkshop" },
    { value: "certification_training", labelKey: "mcTypeCertification" },
  ];

export function getClassTypeLabelKey(
  type: MasterClassType | null | undefined,
): string {
  return (
    CLASS_TYPE_OPTIONS.find((o) => o.value === type)?.labelKey ??
    "mcTypeMasterclass"
  );
}

/** Server `label` first, else the translated type. */
export function getClassTypeLabel(
  cls: Pick<MasterClass, "label" | "type"> | null | undefined,
): string {
  return cls?.label || tr(getClassTypeLabelKey(cls?.type));
}

export const MASTER_CLASS_TABS: { value: MasterClassTab; labelKey: string }[] =
  [
    { value: "upcoming", labelKey: "mcTabUpcoming" },
    { value: "drafts", labelKey: "mcTabDrafts" },
    { value: "past", labelKey: "mcTabPast" },
  ];

export const ENROLLMENT_FILTERS: {
  value: ClassEnrollmentFilter;
  labelKey: string;
}[] = [
  { value: "confirmed", labelKey: "mcEnrollTabUpcoming" },
  { value: "cancelled", labelKey: "mcEnrollTabCancelled" },
  { value: "refunded", labelKey: "mcEnrollTabRefunded" },
];

export const FORMAT_OPTIONS: { value: MasterClassFormat; labelKey: string }[] =
  [
    { value: "in_person", labelKey: "mcFormatInPerson" },
    { value: "online", labelKey: "mcFormatOnline" },
  ];

/** Minutes. Server accepts 15–1440. */
export const DURATION_OPTIONS: number[] = [
  30, 60, 90, 120, 180, 240, 300, 360, 480, 600,
];
export const FULL_DAY_MINUTES = 600;

export const CANCELLATION_WINDOW_OPTIONS: CancellationWindowHours[] = [
  24, 48, 72,
];
export const DEFAULT_CANCELLATION_WINDOW: CancellationWindowHours = 48;

export const CLASS_LIMITS = {
  titleMax: 150,
  durationMin: 15,
  durationMax: 1440,
  capacityMin: 1,
  capacityMax: 1000,
  priceMin: 1,
} as const;

// ── Dates & times (business clock — never converted) ────────────────

/** "YYYY-MM-DD" → "Nov 15, 2026". */
export function formatClassDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = dayjs(date.slice(0, 10));
  return d.isValid() ? d.format("MMM D, YYYY") : date;
}

/** "YYYY-MM-DD" → "Nov 15". */
export function formatClassShortDate(date: string | null | undefined): string {
  if (!date) return "";
  const d = dayjs(date.slice(0, 10));
  return d.isValid() ? d.format("MMM D") : date;
}

/** "HH:mm" (or "HH:mm:ss") → "10:00 AM". */
export function formatClassTime(time: string | null | undefined): string {
  if (!time) return "";
  const d = dayjs(`2000-01-01T${time.slice(0, 5)}`);
  return d.isValid() ? d.format("h:mm A") : time;
}

/** "Nov 15, 2026 • 10:00 AM"; "" when there is no date. */
export function formatClassDateTime(
  date: string | null | undefined,
  time: string | null | undefined,
): string {
  const d = formatClassDate(date);
  if (!d) return "";
  const t = formatClassTime(time);
  return t ? `${d} • ${t}` : d;
}

/** Same as formatClassDateTime, with "No date yet" for undated drafts. */
export function getClassWhenText(
  cls: Pick<MasterClass, "date" | "time"> | null | undefined,
): string {
  return formatClassDateTime(cls?.date, cls?.time) || tr("mcNoDateYet");
}

/**
 * ISO with offset (refund_deadline, listing.ends_at) → "Nov 13, 2026 • 10:00 AM".
 * A numeric offset is the business clock, so its wall time is read as-is;
 * a UTC "Z" time falls back to the device clock.
 */
export function formatIsoOnOwnClock(
  iso: string | null | undefined,
  withTime = true,
): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (match && !/Z$/i.test(iso)) {
    return withTime
      ? formatClassDateTime(match[1], match[2])
      : formatClassDate(match[1]);
  }
  const d = dayjs(iso);
  if (!d.isValid()) return iso;
  return d.format(withTime ? "MMM D, YYYY • h:mm A" : "MMM D, YYYY");
}

/**
 * True when date + time (business clock) is still ahead. With the class's
 * `timezone` it compares against the salon's clock; without one (a class not
 * saved yet) it falls back to the phone clock and the server's 422 decides.
 */
export function isClassDateTimeInFuture(
  date: string | null | undefined,
  time: string | null | undefined,
  timeZone?: string | null,
): boolean {
  if (!date || !time) return false;
  const day = dayjs(date.slice(0, 10));
  const hm = time.slice(0, 5);
  if (!day.isValid() || !/^\d{2}:\d{2}$/.test(hm)) return false;
  return !salonSlotHasPassed(day, hm, salonNow(null, timeZone));
}

/**
 * What cancelling now refunds. `refund_if_cancelled_now` is from the last
 * fetch, so once `refund_deadline` has passed it counts as 0 (a rescheduled
 * seat keeps its full refund until the class starts).
 */
export function getRefundIfCancelledNow(
  enrollment: Pick<
    ClassEnrollment,
    "refund_if_cancelled_now" | "refund_deadline" | "rescheduled"
  > | null | undefined,
): number {
  if (!enrollment) return 0;
  const refund = enrollment.refund_if_cancelled_now ?? 0;
  if (refund <= 0 || enrollment.rescheduled) return Math.max(0, refund);
  const deadline = enrollment.refund_deadline
    ? Date.parse(enrollment.refund_deadline)
    : NaN;
  return Number.isFinite(deadline) && deadline <= Date.now() ? 0 : refund;
}

/** 240 → "4 hours", 90 → "1 h 30 min", 45 → "45 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return tr("mcDurationMinutes", { count: m });
  if (m === 0) return tr("mcDurationHours", { count: h });
  return tr("mcDurationHoursMinutes", { hours: h, minutes: m });
}

/** Duration dropdown label ("Full day (10 hours)" for 600). */
export function formatDurationOption(minutes: number): string {
  return minutes === FULL_DAY_MINUTES
    ? tr("mcDurationFullDay", { duration: formatDuration(minutes) })
    : formatDuration(minutes);
}

// ── Money ───────────────────────────────────────────────────────────

/** 149 → "$149", 149.5 → "$149.50". */
export function formatClassPrice(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return "";
  }
  const whole = Math.abs(amount % 1) < 0.005;
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

/** What a student pays now and the struck-through original (only when discounted). */
export function getClassPrice(
  cls: Pick<MasterClass, "price" | "discounted_price" | "enrollment_price">,
): { current: number | null; original: number | null } {
  const discounted =
    cls.discounted_price != null &&
    cls.price != null &&
    cls.discounted_price < cls.price;
  const current =
    cls.enrollment_price ?? (discounted ? cls.discounted_price : cls.price);
  return {
    current: current ?? null,
    original: discounted ? cls.price : null,
  };
}

// ── Seats ───────────────────────────────────────────────────────────

export function getSeatsLeft(
  cls: Pick<MasterClass, "seats_left" | "capacity" | "seats_taken">,
): number | null {
  if (cls.seats_left != null) return Math.max(0, cls.seats_left);
  if (cls.capacity == null) return null;
  return Math.max(0, cls.capacity - (cls.seats_taken ?? 0));
}

/** "8 / 12 Enrolled". */
export function getSeatsEnrolledText(
  cls: Pick<MasterClass, "seats_taken" | "capacity">,
): string {
  return tr("mcSeatsEnrolled", {
    taken: cls.seats_taken ?? 0,
    total: cls.capacity ?? 0,
  });
}

/** "4 seats left" / "1 seat left" / "Full". */
export function getSeatsLeftText(
  cls: Pick<MasterClass, "seats_left" | "capacity" | "seats_taken">,
): string {
  const left = getSeatsLeft(cls);
  if (left == null) return "";
  return left === 0 ? tr("mcClassFull") : tr("mcSeatsLeft", { count: left });
}

// ── Status & listing badges ─────────────────────────────────────────

export type ClassBadgeTone =
  | "draft"
  | "live"
  | "warning"
  | "danger"
  | "neutral"
  | "info";

export interface ClassBadgeMeta {
  tone: ClassBadgeTone;
  label: string;
  /** Ionicons name for a leading glyph. */
  icon?: string;
}

export function getToneColors(
  theme: Theme,
  tone: ClassBadgeTone,
): { bg: string; fg: string; border: string } {
  switch (tone) {
    case "live":
      return {
        bg: theme.tileMint,
        fg: theme.successGreen,
        border: theme.successCardBorder,
      };
    case "warning":
      return {
        bg: theme.tilePeach,
        fg: theme.orangeBrownText,
        border: theme.orangeBrown30,
      };
    case "danger":
      return { bg: theme.lightRed, fg: theme.red, border: theme.lightRed30 };
    case "info":
      return {
        bg: theme.tileGoldCream,
        fg: theme.goldTextDark,
        border: theme.goldBorder,
      };
    case "draft":
      return {
        bg: theme.lightGreen07,
        fg: theme.darkGreen,
        border: theme.borderNormal,
      };
    default:
      return {
        bg: theme.lightGreen05,
        fg: theme.lightGreen,
        border: theme.borderLight,
      };
  }
}

/** "Dec 5" from listing.listed_until (or ends_at). */
export function getListedUntilText(
  listing: ClassListing | null | undefined,
): string {
  const raw = listing?.listed_until || listing?.ends_at;
  if (!raw) return "";
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match && !/Z$/i.test(raw)) return formatClassShortDate(match[0]);
  const d = dayjs(raw);
  return d.isValid() ? d.format("MMM D") : raw;
}

/** Class lifecycle chip (draft / live / cancelled …). */
export function getClassStatusMeta(status: MasterClassStatus): ClassBadgeMeta {
  switch (status) {
    case "draft":
      return { tone: "draft", label: tr("mcStatusDraft"), icon: "create-outline" };
    case "published":
      return {
        tone: "live",
        label: tr("mcStatusPublished"),
        icon: "checkmark-circle",
      };
    case "cancelled":
      return {
        tone: "danger",
        label: tr("mcStatusCancelled"),
        icon: "close-circle-outline",
      };
    case "suspended":
      return {
        tone: "danger",
        label: tr("mcStatusSuspended"),
        icon: "pause-circle-outline",
      };
    case "removed":
      return {
        tone: "danger",
        label: tr("mcStatusRemoved"),
        icon: "remove-circle-outline",
      };
    default:
      return { tone: "neutral", label: String(status) };
  }
}

/**
 * The one badge a pro list card shows: lifecycle problems first, then
 * the listing (Draft · Live until Dec 5 · Listing ended).
 */
export function getListingBadge(
  cls: Pick<MasterClass, "status" | "listing">,
): ClassBadgeMeta {
  if (cls.status !== "published") return getClassStatusMeta(cls.status);
  const listing = cls.listing;
  switch (listing?.status) {
    case "active": {
      const until = getListedUntilText(listing);
      return {
        tone: "live",
        label: until ? tr("mcListingLiveUntil", { date: until }) : tr("mcListingLive"),
        icon: "radio-button-on",
      };
    }
    case "expired":
    case "ended":
      return { tone: "warning", label: tr("mcListingEnded"), icon: "time-outline" };
    default:
      return { tone: "neutral", label: tr("mcListingNotListed") };
  }
}

export function getEnrollmentStatusMeta(
  status: ClassEnrollmentStatus,
): ClassBadgeMeta {
  switch (status) {
    case "confirmed":
      return {
        tone: "live",
        label: tr("mcEnrollStatusConfirmed"),
        icon: "checkmark-circle",
      };
    case "pending":
      return { tone: "info", label: tr("mcEnrollStatusPending"), icon: "time-outline" };
    case "cancelled":
      return {
        tone: "neutral",
        label: tr("mcEnrollStatusCancelled"),
        icon: "close-circle-outline",
      };
    case "refunded":
      return {
        tone: "warning",
        label: tr("mcEnrollStatusRefunded"),
        icon: "return-down-back-outline",
      };
    case "failed":
      return { tone: "danger", label: tr("mcEnrollStatusFailed"), icon: "alert-circle-outline" };
    case "expired":
      return { tone: "neutral", label: tr("mcEnrollStatusExpired"), icon: "hourglass-outline" };
    default:
      return { tone: "neutral", label: String(status) };
  }
}

/** Number of publish steps still missing on a draft. */
export function getMissingCount(cls: Pick<MasterClass, "missing">): number {
  return cls.missing ? Object.keys(cls.missing).length : 0;
}

// ── Display bits ────────────────────────────────────────────────────

/** Image for list cards: video thumbnail, else the media URL. */
export function getClassThumbUrl(
  cls: Pick<MasterClass, "media"> | null | undefined,
): string | null {
  const media = cls?.media;
  if (!media) return null;
  return media.type === "video"
    ? media.thumbnail_url || null
    : media.url || media.thumbnail_url || null;
}

export function isVideoClass(cls: Pick<MasterClass, "media"> | null | undefined) {
  return cls?.media?.type === "video";
}

/** "by {instructor}" source: instructor name, else business title. */
export function getInstructorName(
  cls: Pick<MasterClass, "business"> | null | undefined,
): string {
  return cls?.business?.instructor_name || cls?.business?.title || "";
}

export function getBusinessCategoryName(
  category: MasterClassBusinessCategory | undefined,
): string {
  if (!category) return "";
  if (typeof category === "string") return category;
  return category.name || category.title || "";
}

/** "In person" / "Online". */
export function getFormatLabel(format: MasterClassFormat | null | undefined) {
  return format === "online" ? tr("mcFormatOnline") : tr("mcFormatInPerson");
}

/** Address for an in-person class (null online / unknown). */
export function getClassAddress(
  cls: Pick<MasterClass, "format" | "location">,
): string | null {
  if (cls.format === "online") return null;
  return cls.location?.address || null;
}

/** "Jane Doe" → "JD". */
export function getInitials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (
    (parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")
  ).toUpperCase();
}

export function isValidMeetingUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim());
}

// ── Deals row ───────────────────────────────────────────────────────

export type DealsRowItem<B, C> =
  | { kind: "business"; item: B }
  | { kind: "class"; item: C };

/**
 * One class after every two businesses; leftover classes go at the end.
 * Classes keep their order (the API sends them soonest first).
 */
export function mixDealsWithClasses<B, C>(
  businesses: B[],
  classes: C[],
): DealsRowItem<B, C>[] {
  const out: DealsRowItem<B, C>[] = [];
  let c = 0;
  businesses.forEach((business, i) => {
    out.push({ kind: "business", item: business });
    if ((i + 1) % 2 === 0 && c < classes.length) {
      out.push({ kind: "class", item: classes[c++] });
    }
  });
  while (c < classes.length) out.push({ kind: "class", item: classes[c++] });
  return out;
}
