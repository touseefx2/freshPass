import { ApiService } from "./api";
import { slotOfferEndpoints } from "./endpoints";
import type {
  SlotOffer,
  SlotOfferListResponse,
  SlotOfferMineResponse,
  SlotOfferCreatePayload,
} from "@/src/types/slotOffer";

const EMPTY_META = { current_page: 1, per_page: 20, total: 0, last_page: 1 };
const REQUEST_TIMEOUT = 10_000;

export async function fetchSlotOffers(params?: {
  category_id?: number;
  category_ids?: number[];
  date?: string;
  min_price?: number;
  max_price?: number;
  per_page?: number;
  page?: number;
}): Promise<{ items: SlotOffer[]; meta: SlotOfferListResponse["meta"] }> {
  const res = await ApiService.get<SlotOfferListResponse>(
    slotOfferEndpoints.list(params),
    { timeout: REQUEST_TIMEOUT },
  );
  const data = Array.isArray(res?.data) ? res.data : [];
  return { items: data, meta: res?.meta ?? EMPTY_META };
}

export async function fetchSlotOfferDetail(id: number | string): Promise<SlotOffer | null> {
  try {
    const res = await ApiService.get<{ data: SlotOffer }>(
      slotOfferEndpoints.detail(id),
    );
    return res?.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}

const EMPTY_SUMMARY = { live: 0, views: 0, booked: 0, completed: 0, cancelled: 0, revenue: 0 };

export async function fetchMySlotOffers(params?: {
  status?: string;
  per_page?: number;
  page?: number;
}): Promise<SlotOfferMineResponse> {
  const res = await ApiService.get<SlotOfferMineResponse>(
    slotOfferEndpoints.mine(params),
    { timeout: REQUEST_TIMEOUT },
  );
  return {
    data: Array.isArray(res?.data) ? res.data : [],
    meta: res?.meta ?? EMPTY_META,
    summary: res?.summary ?? EMPTY_SUMMARY,
  };
}

export async function createSlotOffer(payload: SlotOfferCreatePayload): Promise<SlotOffer> {
  const res = await ApiService.post<{ data: SlotOffer }>(
    slotOfferEndpoints.create,
    payload,
  );
  return res.data;
}

export async function patchSlotOffer(
  id: number | string,
  action: "pause" | "resume" | "withdraw",
): Promise<SlotOffer> {
  const res = await ApiService.patch<{ data: SlotOffer }>(
    slotOfferEndpoints.patch(id),
    { action },
  );
  return res.data;
}
