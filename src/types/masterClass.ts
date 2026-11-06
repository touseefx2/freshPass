// Master Classes — API contract (backend guide section 13).
// Class fields are snake_case; the two payment-sheet answers are camelCase.
// `date` / `time` are already on the business clock: show them as they come.

export type MasterClassType =
  | "masterclass"
  | "workshop"
  | "certification_training";

export type MasterClassStatus =
  | "draft"
  | "published"
  | "cancelled"
  | "suspended"
  | "removed";

export type MasterClassFormat = "in_person" | "online";

/** In person only: the business address or a custom one. */
export type MasterClassLocationType = "business" | "custom";

export type CancellationWindowHours = 24 | 48 | 72;

/** Tabs of `GET /master-classes/mine`. */
export type MasterClassTab = "upcoming" | "drafts" | "past";

/** `none` = never paid, `active` = in Deals now, `expired` / `ended` = out of Deals. */
export type ClassListingStatus = "none" | "active" | "expired" | "ended";

export type ClassEnrollmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "expired";

/** Filter of `GET /class-enrollments`. */
export type ClassEnrollmentFilter = "confirmed" | "cancelled" | "refunded";

export type ClassCancelledBy = "student" | "pro" | "admin" | "reschedule";

export interface MasterClassMedia {
  id: number;
  type: "image" | "video";
  url: string | null;
  thumbnail_url: string | null;
}

export interface MasterClassLocation {
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export type MasterClassBusinessCategory =
  | string
  | { id?: number; name?: string | null; title?: string | null }
  | null;

export interface MasterClassBusiness {
  id: number;
  title: string;
  image_url: string | null;
  instructor_name: string | null;
  category: MasterClassBusinessCategory;
}

/** Pro only. */
export interface ClassListing {
  status: ClassListingStatus;
  /** ISO 8601 with offset. */
  ends_at: string | null;
  /** End of the listing on the business clock (date or date-time string). */
  listed_until: string | null;
  can_renew: boolean;
  /** Listing fee in dollars (50). */
  fee: number;
  /** Days one payment lists the class (30). */
  days: number;
}

export interface MyClassEnrollmentRef {
  id: number;
  status: ClassEnrollmentStatus;
}

/** Field → message, e.g. `{ price: "Set the class price." }`. Empty = ready. */
export type MasterClassMissing = Record<string, string>;

/** Section 13.6. Optional fields are absent for some viewers. */
export interface MasterClass {
  id: number;
  title: string;
  type: MasterClassType | null;
  /** Ready-to-show type label ("Masterclass", …). */
  label: string | null;
  description: string | null;
  prerequisites: string | null;
  /** Certification Training only. */
  certification_notice: string | null;

  /** "YYYY-MM-DD", business clock. Null on drafts without a date. */
  date: string | null;
  /** "HH:mm", business clock. */
  time: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  duration_minutes: number | null;

  capacity: number | null;
  seats_taken: number;
  seats_left: number | null;

  price: number | null;
  discounted_price: number | null;
  /** What a student pays (discounted price when set). */
  enrollment_price: number | null;

  cancellation_window_hours: CancellationWindowHours | number | null;
  /** Ready-to-show cancellation text. */
  cancellation_terms: string | null;

  format: MasterClassFormat | null;
  location_type: MasterClassLocationType | null;
  /** Null for online classes. */
  location: MasterClassLocation | null;
  /** Pro and paid students only. */
  meeting_url: string | null;

  media: MasterClassMedia | null;
  business: MasterClassBusiness | null;
  status: MasterClassStatus;

  // Customer side
  can_enroll?: boolean;
  my_enrollment?: MyClassEnrollmentRef | null;
  distance_km?: number | null;

  // Pro side
  listing?: ClassListing | null;
  /** Pro drafts only. */
  missing?: MasterClassMissing | null;

  published_at?: string | null;
  cancelled_at?: string | null;
  rescheduled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Section 13.5 — `refund` exists after a refund. */
export interface ClassEnrollmentRefund {
  amount: number;
  reason: string | null;
  status: "processing" | "refunded";
}

export interface ClassEnrollment {
  id: number;
  status: ClassEnrollmentStatus;
  /** What the student paid. */
  amount: number;
  cancellation_window_hours: number | null;
  cancelled_by: ClassCancelledBy | null;
  /** False once the class has started. */
  can_cancel: boolean;
  /** Full price, or 0 when it is too late for a refund. */
  refund_if_cancelled_now: number;
  /** Last moment for a full refund (ISO). */
  refund_deadline: string | null;
  /** True when the class moved; full refund until it starts. */
  rescheduled: boolean;
  refund: ClassEnrollmentRefund | null;
  hold_expires_at: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  /** Full class. */
  class: MasterClass | null;
}

export interface ClassStudentInfo {
  id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  image_url: string | null;
}

/** One row of `GET /master-classes/{id}/enrollments`. */
export interface ClassStudent {
  id: number;
  status: ClassEnrollmentStatus;
  amount: number;
  paid_at: string | null;
  student: ClassStudentInfo;
}

// ── Payloads ────────────────────────────────────────────────────────

/** POST / PATCH body. Send only what the pro filled (or changed). */
export interface MasterClassPayload {
  title?: string;
  /** null clears it on a draft. */
  type?: MasterClassType | null;
  description?: string | null;
  prerequisites?: string | null;
  /** "YYYY-MM-DD" — always with `time` (both null clear a draft's date). */
  date?: string | null;
  /** "HH:mm" — always with `date`. */
  time?: string | null;
  duration_minutes?: number | null;
  capacity?: number | null;
  price?: number | null;
  discounted_price?: number | null;
  cancellation_window_hours?: CancellationWindowHours;
  format?: MasterClassFormat;
  location_type?: MasterClassLocationType;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  meeting_url?: string | null;
  media_asset_id?: number | null;
}

/** `GET /master-classes` — same filters as the Deals business call. */
export interface PublicClassListParams {
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  category_ids?: number[];
  page?: number;
  per_page?: number;
}

// ── List responses ──────────────────────────────────────────────────

export interface MasterClassListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface MasterClassCounts {
  upcoming: number;
  drafts: number;
  past: number;
}

export interface MasterClassMineResult {
  items: MasterClass[];
  meta: MasterClassListMeta;
  counts: MasterClassCounts;
}

export interface MasterClassPublicResult {
  items: MasterClass[];
  meta: MasterClassListMeta;
}

export interface ClassEnrollmentListResult {
  items: ClassEnrollment[];
  meta: MasterClassListMeta;
}

export interface ClassStudentListResult {
  items: ClassStudent[];
  meta: MasterClassListMeta | null;
}

// ── Payment sheets (normalized) ─────────────────────────────────────

/** `POST /payment-sheet/class-listing` — FreshPass's own Stripe account. */
export interface ClassListingPaymentSheet {
  paymentIntentClientSecret: string;
  customerId: string;
  customerSessionClientSecret: string | null;
  amount: number;
  days: number;
}

/** `POST /payment-sheet/class-enrollment` — direct charge on the pro's account. */
export interface ClassEnrollmentPaymentSheet {
  paymentIntentClientSecret: string;
  customerId: string;
  customerSessionClientSecret: string | null;
  connectedAccountId: string;
  enrollmentId: number;
  amount: number;
  holdExpiresAt: string | null;
}

/** `POST /class-enrollments/{id}/cancel`. */
export interface ClassEnrollmentCancelResult {
  status: "refunded" | "cancelled";
  enrollment: ClassEnrollment | null;
  message: string | null;
}

// ── Errors ──────────────────────────────────────────────────────────

export interface MasterClassApiError {
  /** HTTP status, null when there was no response (offline / timeout). */
  status: number | null;
  message: string;
  /** `errors.<field>[0]` for each rejected field (`stripe`, `starts_at`, …). */
  fieldErrors: Record<string, string>;
}

// ── Notifications (13.7) ────────────────────────────────────────────

export type MasterClassNotificationType = "master_class" | "class_enrollment";

/** `type === "master_class"`, model_id = class id, pro in business mode. */
export type MasterClassProNotificationSubType =
  | "master_class_published"
  | "master_class_listing_ending"
  | "master_class_listing_ended"
  | "master_class_new_enrollment"
  | "master_class_student_cancelled"
  | "master_class_moderated"
  | "master_class_refund_failed";

/** `type === "class_enrollment"`, model_id = enrollment id, student in customer mode. */
export type ClassEnrollmentNotificationSubType =
  | "class_enrollment_confirmed"
  | "class_rescheduled"
  | "class_cancelled"
  | "class_enrollment_refunded"
  | "class_reminder";

export type MasterClassNotificationSubType =
  | MasterClassProNotificationSubType
  | ClassEnrollmentNotificationSubType;

export interface MasterClassNotificationData {
  master_class_id?: number | string;
  /** `master_class_moderated` only. */
  reason?: string;
  [key: string]: unknown;
}
