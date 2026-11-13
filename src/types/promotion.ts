/**
 * Profile Promotions (backend guide: profile-promotions-app-guide.md).
 * The server works out who qualifies and every price; the app only shows them.
 */

export type PromotionAudience = "new" | "returning" | "everyone";
export type PromotionDiscountType = "percent" | "fixed";
export type PromotionStatus =
  | "draft"
  | "active"
  | "paused"
  | "scheduled"
  | "ended"
  | "suspended"
  | (string & {});

/** Where the customer found the offer (sent with views and bookings). */
export type PromotionSource = "profile" | "reel" | "link" | "email";

export type PromotionEligibilityReason =
  | "sign_in_required"
  | "not_open"
  | "already_used"
  | "not_new_customer"
  | "not_returning_customer"
  | "limit_reached"
  | "own_business"
  /** Private email offer opened without the matching claim */
  | "claim_required"
  /** Imported customer whose visit history is unknown */
  | "history_unverified"
  | (string & {});

/** Extra reason codes on a refused booking / reschedule. */
export type PromotionBookingReason =
  | PromotionEligibilityReason
  | "service_not_included"
  | "staff_not_included"
  | "outside_visit_dates"
  | "weekday_not_included"
  | "time_not_included"
  | "cannot_combine";

export interface PromotionEligibility {
  /** null = not signed in */
  eligible: boolean | null;
  reason: PromotionEligibilityReason | null;
  message: string | null;
}

export interface PromotionServicePrice {
  id: number;
  name: string;
  original_price: number;
  discount: number;
  final_price: number;
}

export interface PromotionStaff {
  id: number;
  name: string;
}

export interface PromotionBusiness {
  id: number;
  title: string;
  slug: string | null;
  image_url: string | null;
}

export interface PromotionResults {
  views: number;
  booking_starts: number;
  confirmed_bookings: number;
  completed_visits: number;
  discount_total: number;
  revenue: number;
}

export interface Promotion {
  id: number;
  business: PromotionBusiness | null;
  title: string;
  description: string | null;
  image_url: string | null;
  savings_label: string | null;
  chip_label: string | null;
  audience: PromotionAudience;
  audience_label: string | null;
  discount_type: PromotionDiscountType;
  discount_value: number;
  services: PromotionServicePrice[];
  /** Empty = every staff member */
  staff: PromotionStaff[];
  booking_label: string | null;
  visit_label: string | null;
  booking_starts_at: string | null;
  booking_ends_at: string | null;
  visit_starts_on: string | null;
  visit_ends_on: string | null;
  /** 0 = Sunday … 6 = Saturday. Empty = every day. */
  weekdays: number[];
  time_from: string | null;
  time_to: string | null;
  timezone: string | null;
  max_redemptions: number | null;
  reel_id: number | null;
  restrictions: string[];
  eligibility: PromotionEligibility | null;
  status: PromotionStatus;
  suspended_reason: string | null;
  reserved_count: number;
  used_count: number;
  views_count: number;
  results: PromotionResults | null;
}

export interface BusinessPromotionsResponse {
  /** null = no chip */
  chip_label: string | null;
  promotions: Promotion[];
}

export interface PromotionListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface MyPromotionsResult {
  items: Promotion[];
  meta: PromotionListMeta;
  can_promote: boolean;
  included_note: string | null;
}

/** Create / edit body (edit: send only what changes). */
export interface PromotionPayload {
  title?: string;
  description?: string;
  audience?: PromotionAudience;
  discount_type?: PromotionDiscountType;
  discount_value?: number;
  service_ids?: number[];
  staff_ids?: number[];
  /** "YYYY-MM-DD HH:mm", salon clock */
  booking_starts_at?: string;
  booking_ends_at?: string;
  /** "YYYY-MM-DD", salon clock */
  visit_starts_on?: string;
  visit_ends_on?: string;
  weekdays?: number[];
  time_from?: string | null;
  time_to?: string | null;
  max_redemptions?: number | null;
  reel_id?: number | null;
  /** Local file to upload */
  image?: { uri: string; name?: string; type?: string } | null;
  remove_image?: boolean;
  /** Create only */
  status?: "draft" | "active";
}

/** `promotion` on the booking quote (cancellation-policy), camelCase. */
export interface QuotePromotion {
  id: number;
  title: string;
  eligible: boolean;
  reason: PromotionBookingReason | null;
  message: string | null;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  services: {
    id: number;
    originalPrice: number;
    discount: number;
    finalPrice: number;
  }[];
}

/** `promotion` on booking details / view-and-pay / outcome preview. */
export interface AppointmentPromotion {
  id: number;
  title: string;
  source: PromotionSource | null;
  originalPrice: number;
  discount: number;
  finalPrice: number;
  /** Shop side: new-customer offer whose customer visited since booking. */
  conflict: unknown;
}

/** `promotion` on reschedule-preview. */
export interface ReschedulePromotion {
  applies: boolean;
  reason: PromotionBookingReason | null;
  message: string | null;
  currentPrice: number;
  newPrice: number;
  paidOnline: boolean;
}
