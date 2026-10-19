/** After the visit: View & Pay, "I paid at the salon", per-visit reviews, Book Again. */
import type {
  PaidTip,
  PendingTip,
  TipRecipient,
} from "@/src/services/tipService";

export type VisitPaymentStatus =
  /** Pay Later, still owed */
  | "due"
  /** Customer said they paid at the salon; the business hasn't confirmed */
  | "awaiting_confirmation"
  /** The business said the salon payment didn't arrive */
  | "not_confirmed"
  | "paid"
  | "paid_in_person"
  | "membership"
  | "no_charge";

export type InPersonPaymentStatus = "claimed" | "confirmed" | "rejected";

export interface InPersonPayment {
  status: InPersonPaymentStatus | string;
  /** Always "cash": the only in-person payment FreshPass records */
  method?: "cash" | string | null;
  /** Service total as booked (set once the payment is recorded) */
  serviceAmount?: number | null;
  claimedAt: string | null;
  /** Cash tip the customer named (claim) or the business recorded */
  tipAmount: number | null;
  /** serviceAmount + tipAmount */
  totalAmount?: number | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
}

/**
 * How a tip is paid from View & Pay:
 * with_payment → same charge as the visit (payment-sheet + tip_amount)
 * included → old booking tip already in amountDue (payment-sheet, no tip_amount)
 * separate → its own tip sheet; none → tipping closed
 */
export type TipPayWith = "with_payment" | "included" | "separate" | "none";

export interface AppointmentReview {
  id: number;
  appointmentId: number | null;
  isVerified: boolean;
  overallRating: number;
  comment: string | null;
  reviewSuggestionId: number | null;
  createdAt: string | null;
}

export interface ViewAndPayPayment {
  status: VisitPaymentStatus | string;
  /** Stays true while a salon claim waits — a claim is never a payment */
  required: boolean;
  serviceAmount: number | null;
  bookingTipAmount: number | null;
  amountDue: number | null;
  paidAt: string | null;
  amountPaid: number | null;
  canPayOnline: boolean;
  canClaimPaidInPerson: boolean;
  claimPaidInPersonReason: string | null;
  inPersonPayment: InPersonPayment | null;
}

export interface ViewAndPayTip {
  canTip: boolean;
  reason: string | null;
  tipDeclined: boolean;
  recipient: TipRecipient | null;
  suggestedAmounts: number[];
  minAmount: number;
  maxAmount: number;
  currency: string;
  tip: PaidTip | null;
  pendingTip: PendingTip | null;
  payWith: TipPayWith | string;
}

export interface ViewAndPay {
  appointmentId: number;
  appointmentType: "service" | "subscription" | string;
  status: string;
  /** MM/DD/YYYY */
  appointmentDate: string;
  /** HH:mm */
  appointmentTime: string;
  business: { id: number; title: string; logoUrl: string | null };
  staff: { id: number; name: string; image: string | null } | null;
  services: Array<{ id: number; name: string; price: number }>;
  payment: ViewAndPayPayment;
  tip: ViewAndPayTip;
  review: {
    canReview: boolean;
    reason: string | null;
    review: AppointmentReview | null;
  };
  canBookAgain: boolean;
  currency: string;
}

export interface BookAgainService {
  id: number;
  name: string;
  /** Today's price */
  price: number;
  /** What they paid last time */
  previousPrice: number | null;
  duration: { hours: number; minutes: number } | null;
  available: boolean;
}

export interface BookAgainData {
  appointmentId: number;
  appointmentType: "service" | "subscription" | string;
  subscriptionId: number | null;
  business: {
    id: number;
    title: string;
    logoUrl: string | null;
    isBookable: boolean;
  };
  staff: {
    id: number;
    name: string;
    image: string | null;
    isOwner: boolean;
    available: boolean;
  } | null;
  services: BookAgainService[];
  canBookAgain: boolean;
  message: string | null;
}
