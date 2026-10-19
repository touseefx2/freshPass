import { ApiService } from "@/src/services/api";
import { availableNowEndpoints } from "@/src/services/endpoints";
import type {
  AvailableNowListItem,
  AvailableNowListMeta,
  AvailableNowListParams,
  AvailableNowMe,
  SaveAvailableNowPayload,
} from "@/src/types/availableNow";

export const AVAILABLE_NOW_PER_PAGE = 20;

type Envelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

/** GET /api/available-now/me — the signed-in owner/staff's controls and live status. */
export async function getMyAvailableNow(): Promise<AvailableNowMe> {
  const response = await ApiService.get<Envelope<AvailableNowMe>>(
    availableNowEndpoints.me,
  );
  if (!response?.data?.settings) {
    throw new Error(response?.message || "Failed to load Available Now");
  }
  return response.data;
}

/**
 * PUT /api/available-now/me. A manual window the calendar can't fit comes
 * back as 422 on `start_at` with a ready-to-show message.
 */
export async function saveMyAvailableNow(
  payload: SaveAvailableNowPayload,
): Promise<AvailableNowMe> {
  const response = await ApiService.put<Envelope<AvailableNowMe>>(
    availableNowEndpoints.me,
    payload,
  );
  if (!response?.data?.settings) {
    throw new Error(response?.message || "Failed to save Available Now");
  }
  return response.data;
}

/** GET /api/available-now — public list of pros free now, soonest then nearest. */
export async function fetchAvailableNow(
  params: AvailableNowListParams,
): Promise<{ items: AvailableNowListItem[]; meta: AvailableNowListMeta }> {
  const perPage = params.per_page ?? AVAILABLE_NOW_PER_PAGE;
  const page = params.page ?? 1;
  const response = await ApiService.get<
    Envelope<{ data: AvailableNowListItem[]; meta: AvailableNowListMeta }>
  >(availableNowEndpoints.list({ ...params, page, per_page: perPage }));
  return {
    items: response?.data?.data ?? [],
    meta: response?.data?.meta ?? {
      current_page: page,
      per_page: perPage,
      total: 0,
      last_page: page,
    },
  };
}
