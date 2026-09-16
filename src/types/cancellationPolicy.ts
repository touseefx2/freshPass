/** Shared types for cancellation / no-show fee flows (one-time services). */

export type CancellationCutoffOption = "12" | "24" | "48" | "always";

export interface BusinessCancellationPolicy {
  cancellation_cutoff: CancellationCutoffOption | string;
  cutoff_hours: number | null;
  always_charge: boolean;
  cancellation_fee_percent: number;
  no_show_fee_percent: number;
  cutoff_options: CancellationCutoffOption[] | string[];
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

export interface CancellationPolicyQuote {
  cutoffHours: number | null;
  alwaysCharge: boolean;
  cancellationFeePercent: number;
  noShowFeePercent: number;
  servicePrice: number;
  cancellationFeeAmount: number;
  noShowFeeAmount: number;
  freeCancellationUntil: string | null;
  currency: string;
  policyText: string;
}

export interface CancellationPreview {
  type: string;
  paid: boolean;
  byCustomer: boolean;
  isLate: boolean;
  cutoffHours: number | null;
  feePercent: number;
  servicePrice: number;
  feeAmount: number;
  refundAmount: number;
  chargeAmount: number;
  hasSavedCard: boolean;
  freeCancellationUntil: string | null;
  currency: string;
  message: string;
}

export interface OutcomePreview {
  outcome: "completed" | "no_show";
  title: string;
  question: string;
  message: string;
  paid: boolean;
  servicePrice: number;
  feePercent: number;
  feeAmount: number;
  chargeAmount: number;
  refundAmount: number;
  hasSavedCard: boolean;
  policyApplies: boolean;
  currency: string;
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

export type OutcomeSummaryOutcome = "completed" | "no_show" | "corrected";

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

export type OutcomeVisitStatus =
  | "used"
  | "forfeited"
  | "returned"
  | "restored";

export interface OutcomeSummary {
  outcome: OutcomeSummaryOutcome | string;
  markedAt: string | null;
  markedByName: string | null;
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
