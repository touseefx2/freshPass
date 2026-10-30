import { ApiService } from "@/src/services/api";
import { availableNowEndpoints } from "@/src/services/endpoints";
import type {
  AvailableNowListItem,
  AvailableNowListMeta,
  AvailableNowListParams,
} from "@/src/types/availableNow";

export const AVAILABLE_NOW_PER_PAGE = 20;

type Envelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

/** GET /api/available-now — businesses with free time left today, soonest then nearest. */
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
