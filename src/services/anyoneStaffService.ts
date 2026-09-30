import { ApiService } from "@/src/services/api";
import { appointmentsEndpoints } from "@/src/services/endpoints";

export type AssignAnyoneStaffParams = {
  business_id: number;
  service_ids: number[];
  date: string;
  start_time: string;
};

export type AssignAnyoneStaffResult = {
  staff_id: number;
  staff_name: string | null;
};

type AssignAnyoneStaffApiResponse = {
  success?: boolean;
  data?: {
    staff_id?: number;
    staff_name?: string | null;
  } | null;
  message?: string;
};

/** Normalize slot time to HH:mm (API expects e.g. "13:00"). */
export function normalizeStartTime(startTime: string): string {
  const trimmed = startTime.trim();
  if (trimmed.length >= 5) return trimmed.slice(0, 5);
  return trimmed;
}

/**
 * Backend round-robin assignment for "Anyone" bookings.
 * Call right before create / checkout / reschedule when staff is Anyone.
 */
export async function assignAnyoneStaff(
  params: AssignAnyoneStaffParams,
): Promise<AssignAnyoneStaffResult> {
  const body = {
    business_id: params.business_id,
    service_ids: params.service_ids,
    date: params.date,
    start_time: normalizeStartTime(params.start_time),
  };

  const response = await ApiService.post<AssignAnyoneStaffApiResponse>(
    appointmentsEndpoints.assignAnyoneStaff,
    body,
  );

  const staffId = response?.data?.staff_id;
  if (response?.success && staffId != null) {
    return {
      staff_id: staffId,
      staff_name: response.data?.staff_name ?? null,
    };
  }

  throw new Error(
    response?.message || "No staff available for this time slot.",
  );
}
