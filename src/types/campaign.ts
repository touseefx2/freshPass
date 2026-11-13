/**
 * Bring Customers Back (offer emails). Backend guide:
 * bring-customers-back-app-guide.md. Included in the plan — not an IAP.
 */

import type { PromotionAudience, PromotionDiscountType } from "@/src/types/promotion";

export type CampaignTemplateKey = "return" | "holiday" | (string & {});

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "cancelled"
  | (string & {});

export interface CampaignAllowance {
  limit: number;
  used: number;
  remaining: number;
  /** "YYYY-MM-DD" */
  resetsOn: string | null;
  period: string | null;
  plan: string | null;
  frequencyDays: number | null;
}

export interface CampaignTemplate {
  key: CampaignTemplateKey;
  name: string | null;
  subject: string;
  message: string;
  button: string | null;
}

export interface CampaignHoliday {
  name: string;
  date: string | null;
}

export interface CampaignTemplates {
  templates: CampaignTemplate[];
  tokens: string[];
  holidays: CampaignHoliday[];
}

export type CampaignExclusionReason =
  | "no_email"
  | "suppressed"
  | "unsubscribed"
  | "no_permission"
  | "upcoming_appointment"
  | "recently_emailed"
  | (string & {});

export interface CampaignExclusion {
  reason: CampaignExclusionReason;
  label: string;
  count: number;
}

export interface CampaignAudienceCustomer {
  id: number | string;
  name: string;
  email: string | null;
  lastVisitOn: string | null;
  daysSinceVisit: number | null;
  reason: string | null;
  reasonLabel: string | null;
}

export interface CampaignAudienceQuery {
  inactivity_days: number;
  service_ids: number[];
  staff_ids: number[];
  exclude_upcoming: boolean;
}

export interface CampaignAudience {
  selected: number;
  eligible: number;
  excluded: number;
  exclusions: CampaignExclusion[];
  eligibleCustomers: CampaignAudienceCustomer[];
  excludedCustomers: CampaignAudienceCustomer[];
  allowance: CampaignAllowance | null;
}

export interface CampaignResults {
  selected: number;
  eligible: number;
  excluded: number;
  queued: number;
  sent: number;
  delivered: number;
  clicked: number;
  failed: number;
  skipped: number;
  unsubscribed: number;
  bookings: number;
  completedReturns: number;
  discountTotal: number;
  revenue: number;
}

/** Offer attached to a campaign (summary — prices stay on the server). */
export interface CampaignOffer {
  id: number | null;
  title: string | null;
  savings_label: string | null;
  audience_label: string | null;
  booking_label: string | null;
  visit_label: string | null;
  is_public: boolean | null;
  status: string | null;
}

export interface Campaign {
  id: number;
  status: CampaignStatus;
  template: CampaignTemplateKey;
  holiday_name: string | null;
  subject: string;
  message: string;
  inactivity_days: number | null;
  service_ids: number[];
  staff_ids: number[];
  exclude_upcoming: boolean;
  promotion_id: number | null;
  offer: CampaignOffer | null;
  /** "YYYY-MM-DD HH:mm" salon clock, or ISO */
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string | null;
  results: CampaignResults | null;
}

/** Private offer created with the campaign (Profile Promotions fields). */
export interface CampaignNewOffer {
  title: string;
  description: string;
  audience: PromotionAudience;
  discount_type: PromotionDiscountType;
  discount_value: number;
  service_ids: number[];
  booking_starts_at?: string;
  booking_ends_at: string;
  visit_starts_on: string;
  visit_ends_on: string;
  is_public: boolean;
}

export interface CampaignPayload {
  template?: CampaignTemplateKey;
  holiday_name?: string | null;
  subject?: string;
  message?: string;
  inactivity_days?: number;
  service_ids?: number[];
  staff_ids?: number[];
  exclude_upcoming?: boolean;
  promotion_id?: number;
  offer?: CampaignNewOffer;
}

export type CampaignRecipientStatus = "sent" | "failed" | "skipped" | "excluded";

export interface CampaignRecipient {
  id: number | string;
  name: string;
  email: string | null;
  status: string | null;
  reason: string | null;
  reasonLabel: string | null;
  sentAt: string | null;
  clickedAt: string | null;
  unsubscribedAt: string | null;
  error: string | null;
}

export interface CampaignListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}
