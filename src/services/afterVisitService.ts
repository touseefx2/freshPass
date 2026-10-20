import { ApiService } from "./api";
import { appointmentsEndpoints, reviewsEndpoints } from "./endpoints";
import type {
  AppointmentReview,
  BookAgainData,
  CheckoutMethod,
  ShopPaymentMethod,
  ViewAndPay,
} from "@/src/types/afterVisit";
import type { ReviewListResponse } from "@/src/types/reviews";

type ApiResponse<T> = { success: boolean; message: string; data: T };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Backend message (422 etc. carry a ready-to-show sentence), else the fallback. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    data?: { message?: string };
  } | null;
  return err?.data?.message || err?.message || fallback;
}

/** First 422 message for one field (`errors.tip_amount[0]`), else null. */
export function getApiFieldError(error: unknown, field: string): string | null {
  const errors = (error as { data?: { errors?: Record<string, unknown> } } | null)
    ?.data?.errors;
  const value = errors?.[field];
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null;
  return typeof value === "string" ? value : null;
}

function unwrap<T>(response: ApiResponse<T>, fallback: string): T {
  if (response.success && response.data != null) {
    return response.data;
  }
  throw new Error(response.message || fallback);
}

/** Customer, completed appointments only (422 otherwise). */
export async function fetchViewAndPay(
  appointmentId: number | string,
): Promise<ViewAndPay> {
  const response = await ApiService.get<ApiResponse<ViewAndPay>>(
    appointmentsEndpoints.viewAndPay(appointmentId),
  );
  return unwrap(response, "Could not load this visit.");
}

/**
 * Card payments settle through the Stripe webhook, so View & Pay can still say
 * `due` right after the sheet closes. Refetch at 0s, 1.5s and 3s.
 */
export async function waitForVisitPaid(
  appointmentId: number | string,
): Promise<{ data: ViewAndPay | null; paid: boolean }> {
  let latest: ViewAndPay | null = null;
  for (const delayMs of [0, 1500, 3000]) {
    if (delayMs > 0) await sleep(delayMs);
    try {
      latest = await fetchViewAndPay(appointmentId);
      if (latest.payment.status === "paid") {
        return { data: latest, paid: true };
      }
    } catch {
      // Try again on the next tick; the caller shows "Payment processing".
    }
  }
  return { data: latest, paid: false };
}

/** "I paid at the salon". Returns the refreshed View & Pay payload. */
export async function claimPaidInPerson(
  appointmentId: number | string,
  cashTip: number | null,
): Promise<ViewAndPay> {
  const body: { tip_amount?: number } = {};
  if (cashTip != null && cashTip > 0) body.tip_amount = cashTip;
  const response = await ApiService.post<ApiResponse<ViewAndPay>>(
    appointmentsEndpoints.paidInPerson(appointmentId),
    body,
  );
  return unwrap(response, "Could not send this. Please try again.");
}

/**
 * Business: payment received at the shop (Not Yet Paid → paid later), in cash
 * or on the shop's card machine. `cashTip` is the tip actually received
 * (0 = none). Returns the updated appointment.
 */
export async function confirmInPersonPayment<T = unknown>(
  appointmentId: number | string,
  cashTip: number,
  method: ShopPaymentMethod = "cash",
): Promise<T> {
  const response = await ApiService.post<ApiResponse<T>>(
    appointmentsEndpoints.confirmInPersonPayment(appointmentId),
    { paid_method: method, tip_amount: cashTip },
  );
  return unwrap(response, "Could not confirm the payment.");
}

/**
 * Business checkout (the register): completes the visit and records how it
 * was paid in one call. Nothing is charged. `tipMethod` only applies to
 * freshpass / membership (cash and card tips follow the payment). A 422
 * changes nothing. Returns the updated appointment (with `receipt`).
 */
export async function completeAppointment<T = unknown>(
  appointmentId: number | string,
  payment: { method: CheckoutMethod; tip: number; tipMethod?: ShopPaymentMethod },
  headers?: Record<string, string>,
): Promise<T> {
  const body: {
    outcome: "completed";
    paid_method: CheckoutMethod;
    tip_amount?: number;
    tip_method?: ShopPaymentMethod;
  } = { outcome: "completed", paid_method: payment.method };
  if (payment.method !== "not_paid" && payment.tip > 0) {
    body.tip_amount = payment.tip;
    if (
      (payment.method === "freshpass" || payment.method === "membership") &&
      payment.tipMethod
    ) {
      body.tip_method = payment.tipMethod;
    }
  }
  const response = await ApiService.post<ApiResponse<T>>(
    appointmentsEndpoints.markOutcome(appointmentId),
    body,
    headers ? { headers } : undefined,
  );
  return unwrap(response, "Could not complete this appointment.");
}

/** Business: the salon payment didn't arrive (only while a claim waits). */
export async function rejectInPersonPayment<T = unknown>(
  appointmentId: number | string,
  reason: string,
): Promise<T> {
  const trimmed = reason.trim();
  const response = await ApiService.post<ApiResponse<T>>(
    appointmentsEndpoints.rejectInPersonPayment(appointmentId),
    trimmed ? { reason: trimmed } : {},
  );
  return unwrap(response, "Could not update the payment.");
}

export async function fetchBookAgain(
  appointmentId: number | string,
): Promise<BookAgainData> {
  const response = await ApiService.get<ApiResponse<BookAgainData>>(
    appointmentsEndpoints.bookAgain(appointmentId),
  );
  return unwrap(response, "Could not load this booking.");
}

export type ReviewSuggestion = { id: number; title: string };

export async function fetchReviewSuggestions(): Promise<ReviewSuggestion[]> {
  const response = await ApiService.get<ApiResponse<ReviewSuggestion[]>>(
    reviewsEndpoints.suggestions,
  );
  return response.success && Array.isArray(response.data) ? response.data : [];
}

/** A local file ready for multipart upload (see `prepareReviewPhoto` / `prepareReviewVideo`). */
export type ReviewUploadFile = { uri: string; name: string; type: string };

/**
 * One review per visit: the first send creates it, sending again updates it.
 * JSON when no file is attached, multipart when a photo or video is. Leaving
 * both media fields out keeps the current photo / video; a new file replaces
 * it; `removeImage` / `removeVideo` delete it. (Never PUT: PHP can't read
 * files sent with PUT.)
 */
export async function submitVisitReview(params: {
  appointmentId: number;
  rating: number;
  comment: string;
  suggestionId: number | null;
  image?: ReviewUploadFile | null;
  video?: ReviewUploadFile | null;
  removeImage?: boolean;
  removeVideo?: boolean;
  /** 0–100 while a photo / video uploads */
  onUploadProgress?: (percent: number) => void;
}): Promise<AppointmentReview | null> {
  const hasFile = !!(params.image || params.video);
  const removeImage = !!params.removeImage && !params.image;
  const removeVideo = !!params.removeVideo && !params.video;

  let body: FormData | Record<string, unknown>;
  if (hasFile) {
    const form = new FormData();
    form.append("appointment_id", String(params.appointmentId));
    form.append("overall_rating", String(params.rating));
    form.append("comment", params.comment.trim());
    if (params.suggestionId != null) {
      form.append("review_suggestion_id", String(params.suggestionId));
    }
    if (params.image) form.append("image", params.image as any);
    if (params.video) form.append("video", params.video as any);
    if (removeImage) form.append("remove_image", "1");
    if (removeVideo) form.append("remove_video", "1");
    body = form;
  } else {
    body = {
      appointment_id: params.appointmentId,
      overall_rating: params.rating,
      comment: params.comment.trim(),
      review_suggestion_id: params.suggestionId,
      ...(removeImage ? { remove_image: true } : {}),
      ...(removeVideo ? { remove_video: true } : {}),
    };
  }

  const response = await ApiService.post<ApiResponse<AppointmentReview>>(
    reviewsEndpoints.create,
    body,
    hasFile
      ? {
          headers: { "Content-Type": "multipart/form-data" },
          // A 50 MB video on a slow connection outlasts the 2 min default
          timeout: 5 * 60 * 1000,
          onUploadProgress: (event) => {
            if (!params.onUploadProgress || !event.total) return;
            params.onUploadProgress(
              Math.min(100, Math.round((event.loaded / event.total) * 100)),
            );
          },
        }
      : undefined,
  );
  if (!response.success) {
    throw new Error(response.message || "Failed to submit review.");
  }
  return response.data ?? null;
}

/** GET /api/reviews — a business's, a staff member's or a customer's reviews. */
export async function fetchReviews(params: {
  business_id?: number | string;
  staff_id?: number | string;
  user_id?: number | string;
  page?: number;
  per_page?: number;
}): Promise<ReviewListResponse> {
  return ApiService.get<ReviewListResponse>(reviewsEndpoints.list(params));
}
