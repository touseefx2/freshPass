/** Shared types for cancellation / no-show / membership visit flows. */
import type { CheckoutMethod } from "@/src/types/afterVisit";

export type CancellationCutoffOption = "12" | "24" | "48" | "always";

export interface BusinessCancellationPolicy {
  cancellation_cutoff: CancellationCutoffOption | string;
  cutoff_hours: number | null;
  always_charge: boolean;
  cancellation_fee_percent: number;
  no_show_fee_percent: number;
  cutoff_options: CancellationCutoffOption[] | string[];
  membership_late_cancel_forfeits_visit?: boolean;
  membership_no_show_forfeits_visit?: boolean;
  /** false = no Stripe Connect yet: saved, but no fee is charged */
  policy_active?: boolean;
}

export interface AppointmentCancellationPolicy {
  cutoffHours: number | null;
  alwaysCharge: boolean;
  cancellationFeePercent: number;
  noShowFeePercent: number;
  freeCancellationUntil: string | null;
  text: string;
  acceptedAt?: string | null;
}

export interface MembershipPolicy {
  cutoffHours: number | null;
  alwaysLate: boolean;
  lateCancelForfeitsVisit: boolean;
  noShowForfeitsVisit: boolean;
  freeCancellationUntil: string | null;
  text: string;
  acceptedAt?: string | null;
}

export interface CancellationPolicyQuote {
  appointmentType?: "service" | "subscription" | string;
  cutoffHours: number | null;
  alwaysCharge?: boolean;
  alwaysLate?: boolean;
  cancellationFeePercent?: number;
  noShowFeePercent?: number;
  servicePrice?: number;
  cancellationFeeAmount?: number;
  noShowFeeAmount?: number;
  lateCancelForfeitsVisit?: boolean;
  noShowForfeitsVisit?: boolean;
  freeCancellationUntil: string | null;
  currency?: string;
  policyText: string;
  /** false = business has no Stripe Connect: no fees, skip the policy sheet */
  policyActive?: boolean;
}

export interface CancellationPreview {
  type: string;
  appointmentType?: "service" | "subscription" | string;
  paid?: boolean;
  byCustomer: boolean;
  isLate: boolean;
  cutoffHours?: number | null;
  feePercent?: number;
  servicePrice?: number;
  feeAmount?: number;
  refundAmount?: number;
  chargeAmount?: number;
  hasSavedCard?: boolean;
  forfeitsVisit?: boolean;
  freeCancellationUntil?: string | null;
  currency?: string;
  message: string;
}

export interface OutcomePreview {
  outcome: "completed" | "no_show";
  title: string;
  question: string;
  message: string;
  type?: string;
  appointmentType?: "service" | "subscription" | string;
  paid?: boolean;
  servicePrice?: number;
  feePercent?: number;
  feeAmount?: number;
  chargeAmount?: number;
  refundAmount?: number;
  hasSavedCard?: boolean;
  policyApplies?: boolean;
  forfeitsVisit?: boolean;
  /** Older field; `checkout` now drives the payment options. */
  canPayCash?: boolean;
  /** outcome=completed: the register (options, preselect, tip). */
  checkout?: CheckoutPreview | null;
  currency?: string;
}

export interface CheckoutOption {
  method: CheckoutMethod | string;
  available: boolean;
  /** Why it is greyed out (shown under the option). */
  reason: string | null;
}

export interface CheckoutPreview {
  /** null = still owed, nothing picked until the business chooses */
  preselected: CheckoutMethod | null;
  /** All five, in display order. */
  options: CheckoutOption[];
  /** As booked (not today's price). */
  servicePrice: number | null;
  /** Already paid in the app. */
  amountPaid: number | null;
  /** false = a tip already exists (existingTip); hide the tip input. */
  canAddTip: boolean;
  existingTip: { amount: number; method?: string | null } | null;
}

export interface OutcomeCorrectionPreview {
  type: string;
  paid: boolean;
  chargeAmount: number;
  refundAmount: number;
  hasSavedCard: boolean;
  currency: string;
  message: string;
}

export interface CardSetupResponse {
  customer: string;
  setupIntent: string;
  setupIntentId: string;
  customerSessionClientSecret?: string;
  ephemeralKey?: string;
  businessId: number;
  connectedAccountId: string;
}

export type OutcomeSummaryOutcome =
  | "completed"
  | "no_show"
  | "corrected"
  | "cancelled";

export type OutcomeCancelledBy = "customer" | "business";

export type OutcomeFeeStatus =
  | "none"
  | "charged"
  | "kept_from_payment"
  | "failed"
  | "refunded"
  | "reversed";

export type OutcomePaymentStatus =
  | "paid"
  | "payment_due"
  | "partially_refunded"
  | "refunded"
  | "fee_charged"
  | "charge_failed"
  | "no_charge"
  | "membership"
  /** Business confirmed the visit was paid at the salon. */
  | "paid_in_person"
  /** Customer said they paid at the salon; business hasn't confirmed. */
  | "awaiting_confirmation";

export type AppointmentVisitStatus =
  | "reserved"
  | "used"
  | "forfeited"
  | "returned"
  | "restored";

export type OutcomeVisitStatus =
  | "used"
  | "forfeited"
  | "returned"
  | "restored";

export interface OutcomeSummary {
  outcome: OutcomeSummaryOutcome | string;
  markedAt: string | null;
  markedByName: string | null;
  /** Cancellations only. Who cancelled. Null for other outcomes. */
  cancelledBy?: OutcomeCancelledBy | string | null;
  /** Cancellations only. True when after free-cancel deadline. */
  isLate?: boolean | null;
  /** Cancellations only. Cutoff hours that applied (12/24/48). */
  cutoffHours?: number | null;
  /** Cancellations only. Reason typed when cancelling. */
  cancelReason?: string | null;
  servicePrice: number | null;
  feePercent: number;
  feeAmount: number;
  feeStatus: OutcomeFeeStatus | string;
  amountPaid: number;
  refundAmount: number;
  refundedAt: string | null;
  totalPaid: number;
  paymentStatus: OutcomePaymentStatus | string;
  cardLastFour: string | null;
  visitStatus: OutcomeVisitStatus | string | null;
  message: string;
  currency: string;
}
