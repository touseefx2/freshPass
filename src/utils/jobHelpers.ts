import dayjs from "dayjs";
import type { TFunction } from "i18next";
import type {
  JobApplication,
  JobEmploymentType,
  JobExperienceLevel,
  JobListMeta,
  JobPayPeriod,
  JobPost,
  JobPostBusiness,
  JobPostFilter,
  JobPostStatus,
  JobSchedule,
} from "@/src/types/jobs";
import { getDefaultBusinessLogo } from "@/src/services/remoteConfigService";
import { resolveApiImageUrl } from "@/src/utils/media";

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" ? (value as Raw) : null;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

// ── Allowed values (send these, show our own labels) ────────────────

export const JOB_SCHEDULES: readonly JobSchedule[] = ["full_time", "part_time"];
export const JOB_EMPLOYMENT_TYPES: readonly JobEmploymentType[] = [
  "employee",
  "contractor",
  "booth_rental",
];
export const JOB_EXPERIENCE_LEVELS: readonly JobExperienceLevel[] = [
  "entry_level",
  "1_plus_years",
  "3_plus_years",
  "5_plus_years",
];
export const JOB_PAY_PERIODS: readonly JobPayPeriod[] = [
  "hour",
  "week",
  "month",
  "year",
];
const JOB_STATUSES: readonly JobPostStatus[] = [
  "open",
  "closed",
  "expired",
  "removed",
];
export const JOB_POST_FILTERS: readonly JobPostFilter[] = [
  "all",
  "open",
  "closed",
  "expired",
  "removed",
];

export const JOB_SCHEDULE_LABEL_KEYS: Record<JobSchedule, string> = {
  full_time: "jobScheduleFullTime",
  part_time: "jobSchedulePartTime",
};

export const JOB_EMPLOYMENT_LABEL_KEYS: Record<JobEmploymentType, string> = {
  employee: "jobEmploymentEmployee",
  contractor: "jobEmploymentContractor",
  booth_rental: "jobEmploymentBoothRental",
};

export const JOB_EXPERIENCE_LABEL_KEYS: Record<JobExperienceLevel, string> = {
  entry_level: "jobExperienceEntry",
  "1_plus_years": "jobExperience1Plus",
  "3_plus_years": "jobExperience3Plus",
  "5_plus_years": "jobExperience5Plus",
};

export const JOB_PAY_PERIOD_LABEL_KEYS: Record<JobPayPeriod, string> = {
  hour: "jobPayPeriodHour",
  week: "jobPayPeriodWeek",
  month: "jobPayPeriodMonth",
  year: "jobPayPeriodYear",
};

export const JOB_STATUS_LABEL_KEYS: Record<JobPostStatus, string> = {
  open: "jobStatusOpen",
  closed: "jobStatusClosed",
  expired: "jobStatusExpired",
  removed: "jobStatusRemoved",
};

export const JOB_FILTER_LABEL_KEYS: Record<JobPostFilter, string> = {
  all: "jobFilterAll",
  ...JOB_STATUS_LABEL_KEYS,
};

// ── Normalizing API objects ─────────────────────────────────────────

function normalizeBusiness(value: unknown): JobPostBusiness | null {
  const raw = asRecord(value);
  const id = toNumber(raw?.id);
  if (!raw || id == null) return null;
  return {
    id,
    title: toText(raw.title) ?? "",
    slug: toText(raw.slug),
    // Same fallback as the business profile when no logo is set
    logoUrl:
      resolveApiImageUrl(toText(raw.logo_url)) ?? getDefaultBusinessLogo(),
    ownerId: toNumber(raw.owner_id),
  };
}

export function normalizeJobPost(value: unknown): JobPost {
  const raw = asRecord(value) ?? {};
  const category = asRecord(raw.category);
  const categoryId = toNumber(category?.id);
  const status = pick(raw.status, JOB_STATUSES, "open");
  const payPeriod = toText(raw.pay_period);
  return {
    id: toNumber(raw.id) ?? 0,
    businessId: toNumber(raw.business_id) ?? 0,
    business: normalizeBusiness(raw.business),
    title: toText(raw.title) ?? "",
    category:
      category && categoryId != null
        ? { id: categoryId, name: toText(category.name) ?? "" }
        : null,
    categoryId: toNumber(raw.category_id) ?? categoryId,
    schedule: pick(raw.schedule, JOB_SCHEDULES, "full_time"),
    employmentType: JOB_EMPLOYMENT_TYPES.includes(
      raw.employment_type as JobEmploymentType,
    )
      ? (raw.employment_type as JobEmploymentType)
      : null,
    experienceLevel: pick(
      raw.experience_level,
      JOB_EXPERIENCE_LEVELS,
      "entry_level",
    ),
    licenseRequired: toBool(raw.license_required),
    licenseDetails: toText(raw.license_details),
    description: toText(raw.description) ?? "",
    location: toText(raw.location),
    payMin: toNumber(raw.pay_min),
    payMax: toNumber(raw.pay_max),
    payPeriod: JOB_PAY_PERIODS.includes(payPeriod as JobPayPeriod)
      ? (payPeriod as JobPayPeriod)
      : null,
    compensationNote: toText(raw.compensation_note),
    expiresAt: toText(raw.expires_at)?.slice(0, 10) ?? null,
    status,
    isOpen: typeof raw.is_open === "boolean" ? raw.is_open : status === "open",
    applicationsCount: toNumber(raw.applications_count),
    removedReason: toText(raw.removed_reason),
    removedAt: toText(raw.removed_at),
    hasApplied: toBool(raw.has_applied),
    createdAt: toText(raw.created_at),
    updatedAt: toText(raw.updated_at),
  };
}

export function normalizeJobApplication(value: unknown): JobApplication {
  const raw = asRecord(value) ?? {};
  const applicant = asRecord(raw.applicant);
  const applicantId = toNumber(applicant?.id);
  const resume = asRecord(raw.resume);
  const resumePath = toText(resume?.path);
  return {
    id: toNumber(raw.id) ?? 0,
    jobPostId: toNumber(raw.job_post_id) ?? 0,
    jobPost: raw.job_post ? normalizeJobPost(raw.job_post) : null,
    applicant:
      applicant && applicantId != null
        ? {
            id: applicantId,
            name: toText(applicant.name) ?? "",
            avatar: resolveApiImageUrl(toText(applicant.avatar)),
          }
        : null,
    fullName: toText(raw.full_name) ?? "",
    phone: toText(raw.phone) ?? "",
    email: toText(raw.email) ?? "",
    yearsExperience: toNumber(raw.years_experience) ?? 0,
    hasLicense: toBool(raw.has_license),
    licenseNumber: toText(raw.license_number),
    portfolioUrl: toText(raw.portfolio_url),
    message: toText(raw.message),
    resume: resumePath
      ? {
          name: toText(resume?.name) ?? "resume",
          path: resumeUrl(resumePath),
          mimeType: toText(resume?.mime_type),
        }
      : null,
    chatMessageId: toNumber(raw.chat_message_id),
    createdAt: toText(raw.created_at),
  };
}

/** Same form as chat attachment paths: absolute, or relative to the API host. */
function resumeUrl(path: string): string {
  return resolveApiImageUrl(path) ?? path;
}

export function hasMoreJobPages(meta: JobListMeta | null): boolean {
  if (!meta) return false;
  if (typeof meta.has_more === "boolean") return meta.has_more;
  return (toNumber(meta.current_page) ?? 0) < (toNumber(meta.last_page) ?? 0);
}

// ── Display ─────────────────────────────────────────────────────────

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

/**
 * "$18–25 / hour", "From $18 / hour", "Up to $25 / hour"; null when no pay
 * is listed.
 */
export function formatJobPay(
  post: Pick<JobPost, "payMin" | "payMax" | "payPeriod">,
  t: TFunction,
): string | null {
  const { payMin, payMax, payPeriod } = post;
  if (payMin == null && payMax == null) return null;
  const period = payPeriod ? t(JOB_PAY_PERIOD_LABEL_KEYS[payPeriod]) : null;
  let amount: string;
  if (payMin != null && payMax != null && payMin !== payMax) {
    amount = t("jobPayRange", {
      min: formatAmount(payMin),
      max: formatAmount(payMax),
    });
  } else if (payMin != null && payMax != null) {
    amount = `$${formatAmount(payMin)}`;
  } else if (payMin != null) {
    amount = t("jobPayFrom", { amount: formatAmount(payMin) });
  } else {
    amount = t("jobPayUpTo", { amount: formatAmount(payMax as number) });
  }
  return period ? t("jobPayPerPeriod", { amount, period }) : amount;
}

/** "Full-time · Employee · 3+ years" */
export function formatJobFacts(post: JobPost, t: TFunction): string {
  return [
    t(JOB_SCHEDULE_LABEL_KEYS[post.schedule]),
    post.employmentType
      ? t(JOB_EMPLOYMENT_LABEL_KEYS[post.employmentType])
      : null,
    t(JOB_EXPERIENCE_LABEL_KEYS[post.experienceLevel]),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function formatJobDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = dayjs(value);
  return date.isValid() ? date.format("MMM D, YYYY") : "";
}

/** "Today", "Yesterday", "3 days ago", else the date. */
export function formatJobAgo(
  value: string | null | undefined,
  t: TFunction,
): string {
  if (!value) return "";
  const date = dayjs(value);
  if (!date.isValid()) return "";
  const days = dayjs().startOf("day").diff(date.startOf("day"), "day");
  if (days <= 0) return t("jobToday");
  if (days === 1) return t("jobYesterday");
  if (days < 7) return t("jobDaysAgo", { count: days });
  return date.format("MMM D, YYYY");
}

/** `expires_at` is a calendar date; the post is open through that day. */
export function isJobDatePast(value: string | null | undefined): boolean {
  if (!value) return false;
  const date = dayjs(value);
  return date.isValid() && date.isBefore(dayjs(), "day");
}

/** Allowed closing dates: today up to one year ahead. */
export const JOB_MAX_DAYS_AHEAD = 365;
export const JOB_DEFAULT_DAYS_AHEAD = 30;
export const JOB_DATE_FORMAT = "YYYY-MM-DD";

export type JobStatusTone = "open" | "neutral" | "warn" | "danger";

export function getJobStatusTone(status: JobPostStatus): JobStatusTone {
  switch (status) {
    case "open":
      return "open";
    case "expired":
      return "warn";
    case "removed":
      return "danger";
    default:
      return "neutral";
  }
}

// ── Errors ──────────────────────────────────────────────────────────

export function getJobErrorStatus(error: unknown): number | null {
  return toNumber(asRecord(error)?.status);
}

/** `errors.<field>[0]` for each field the server rejected. */
export function getJobFieldErrors(error: unknown): Record<string, string> {
  const errors = asRecord(asRecord(asRecord(error)?.data)?.errors);
  const result: Record<string, string> = {};
  if (!errors) return result;
  Object.entries(errors).forEach(([field, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (typeof first === "string" && first.trim()) result[field] = first;
  });
  return result;
}

/** Server text first (the API client's own 404 text is generic). */
export function getJobErrorMessage(error: unknown, fallback: string): string {
  const fieldErrors = getJobFieldErrors(error);
  const firstField = Object.values(fieldErrors)[0];
  if (firstField) return firstField;
  const err = asRecord(error);
  return (
    toText(asRecord(err?.data)?.message) ?? toText(err?.message) ?? fallback
  );
}

export type JobApplyBlock =
  "already_applied" | "business_mode" | "own_business";

/** The `errors.job_post` refusals on apply, told apart by their text. */
export function getJobApplyBlock(
  message: string | null | undefined,
): JobApplyBlock | null {
  const text = (message ?? "").toLowerCase();
  if (!text) return null;
  if (text.includes("already applied")) return "already_applied";
  if (text.includes("customer mode")) return "business_mode";
  if (text.includes("own business")) return "own_business";
  return null;
}

// ── Chat ────────────────────────────────────────────────────────────

/** Params for the existing chat screen (`/(main)/chatBox`). */
export function jobChatParams(user: {
  id: number | string;
  name: string;
  image?: string | null;
}) {
  return {
    id: String(user.id),
    chatItem: JSON.stringify({
      id: String(user.id),
      name: user.name,
      image: user.image ?? "",
    }),
  };
}
