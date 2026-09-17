/** Shared types for cancellation / no-show / membership visit flows. */

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
  currency?: string;
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
  | "membership";

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
