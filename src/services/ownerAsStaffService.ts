import { ApiService } from "@/src/services/api";
import { staffEndpoints } from "@/src/services/endpoints";
import Logger from "@/src/services/logger";
import { store } from "@/src/state/store";
import { fetchUserStatus } from "@/src/state/thunks/businessThunks";

export type OwnerAsStaffWorkingHour = {
  day: string;
  closed: boolean;
  opening_time?: string | null;
  closing_time?: string | null;
  break_hours?: Array<{
    start_time: string;
    end_time: string;
  }>;
};

export type OwnerAsStaffEnableBody = {
  description?: string;
  working_hours?: OwnerAsStaffWorkingHour[];
};

export type OwnerAsStaffStaff = {
  id: number;
  user_id?: number;
  business_id?: number;
  name?: string;
  email?: string | null;
  avatar?: string | null;
  description?: string | null;
  active?: number | boolean;
  invitation_status?: string;
  is_owner?: boolean;
  is_business_owner?: boolean;
  working_hours?: unknown[];
};

type OwnerAsStaffMutationResponse = {
  success: boolean;
  message?: string;
  data?: {
    enabled: boolean;
    staff?: OwnerAsStaffStaff | null;
  };
};

async function refreshOwnerAsStaffStatus(): Promise<void> {
  try {
    await store.dispatch(fetchUserStatus({ showError: false }));
  } catch (error) {
    Logger.error("Failed to refresh status after owner-as-staff change:", error);
  }
}

/**
 * Add the authenticated business owner to their own staff team.
 * Empty body copies business opening hours automatically.
 */
export async function enableOwnerAsStaff(
  body?: OwnerAsStaffEnableBody,
): Promise<OwnerAsStaffMutationResponse> {
  const response = await ApiService.post<OwnerAsStaffMutationResponse>(
    staffEndpoints.ownerEnable,
    body ?? {},
  );
  await refreshOwnerAsStaffStatus();
  return response;
}

/**
 * Deactivate the owner on the staff team (record kept for existing appointments).
 */
export async function disableOwnerAsStaff(): Promise<OwnerAsStaffMutationResponse> {
  const response = await ApiService.post<OwnerAsStaffMutationResponse>(
    staffEndpoints.ownerDisable,
  );
  await refreshOwnerAsStaffStatus();
  return response;
}
