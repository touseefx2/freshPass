import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";
import {
  normalizeReschedulePromotion,
} from "@/src/services/promotionService";
import type { ReschedulePromotion } from "@/src/types/promotion";

/**
 * Reschedule preview for the new values. A booking made with an offer gains
 * `promotion` (applies / message / paidOnline); others return null.
 * Errors return null too: the reschedule PUT still refuses (422) when needed.
 */
export async function fetchReschedulePromotion(
  bookingId: string | number,
  params: {
    appointment_date: string;
    appointment_time: string;
    staff_id?: number;
    service_ids?: number[];
  },
): Promise<ReschedulePromotion | null> {
  try {
    const res = await ApiService.get<{ data?: { promotion?: unknown } }>(
      appointmentsEndpoints.reschedulePreview(bookingId, params),
    );
    return normalizeReschedulePromotion(res?.data?.promotion);
  } catch {
    return null;
  }
}
