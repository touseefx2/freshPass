import { ApiService } from "./api";
import { orderEndpoints } from "./endpoints";
import type {
  BusinessShopOrder,
  ShopOrder,
  ShopOrderFilter,
  ShopOrderListMeta,
  ShopOrderNextStatus,
  ShopOrderStats,
} from "@/src/types/shopOrder";
import {
  normalizeBusinessOrder,
  normalizeOrderStats,
  normalizeShopOrder,
} from "@/src/utils/shopOrderHelpers";

/** Every order endpoint answers `{ success, message, data }`. */
interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(response: ApiEnvelope<T>, fallback: string): T {
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.message || fallback);
}

// ── Owner order updates → open order lists ─────────────────────────
// The order screen replaces its order with the PATCH / PUT response; the
// list screen behind it patches the same row instead of reloading.

type BusinessOrderListener = (order: BusinessShopOrder) => void;

const businessOrderListeners = new Set<BusinessOrderListener>();

export function subscribeToBusinessOrderUpdates(
  listener: BusinessOrderListener,
): () => void {
  businessOrderListeners.add(listener);
  return () => {
    businessOrderListeners.delete(listener);
  };
}

function publishBusinessOrder(order: BusinessShopOrder): void {
  businessOrderListeners.forEach((listener) => listener(order));
}

// ── Owner ───────────────────────────────────────────────────────────

/** GET /api/orders/business — rows include `nextStatuses`, never `history`. */
export async function fetchBusinessOrders(params: {
  status?: ShopOrderFilter;
  page?: number;
  per_page?: number;
}): Promise<{ orders: BusinessShopOrder[]; meta: ShopOrderListMeta | null }> {
  const response = await ApiService.get<
    ApiEnvelope<{ data: unknown[]; meta?: ShopOrderListMeta }>
  >(
    orderEndpoints.business({
      status:
        params.status && params.status !== "all" ? params.status : undefined,
      page: params.page,
      per_page: params.per_page,
    }),
  );
  const data = unwrap(response, "Failed to fetch orders");
  return {
    orders: Array.isArray(data.data)
      ? data.data.map(normalizeBusinessOrder)
      : [],
    meta: data.meta ?? null,
  };
}

/** GET /api/orders/business/{order} — with history, nextStatuses, canEditShippingDetails. */
export async function fetchBusinessOrder(
  id: string | number,
): Promise<BusinessShopOrder> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    orderEndpoints.businessById(id),
  );
  return normalizeBusinessOrder(unwrap(response, "Failed to fetch order"));
}

export async function fetchBusinessOrderStats(): Promise<ShopOrderStats> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    orderEndpoints.businessStats,
  );
  return normalizeOrderStats(unwrap(response, "Failed to fetch order stats"));
}

/**
 * PATCH /api/orders/{order}/status. `shippingDetails` is only accepted with
 * "shipped"; sending both in one call gives the customer one notification.
 */
export async function updateOrderStatus(
  id: string | number,
  status: ShopOrderNextStatus,
  shippingDetails?: string,
): Promise<BusinessShopOrder> {
  const body: { status: ShopOrderNextStatus; shipping_details?: string } = {
    status,
  };
  if (status === "shipped" && shippingDetails) {
    body.shipping_details = shippingDetails;
  }
  const response = await ApiService.patch<ApiEnvelope<unknown>>(
    orderEndpoints.updateStatus(id),
    body,
  );
  const order = normalizeBusinessOrder(
    unwrap(response, "Failed to update order status"),
  );
  publishBusinessOrder(order);
  return order;
}

/** PUT /api/orders/{order}/shipping-details — adds or replaces; the customer is notified. */
export async function saveOrderShippingDetails(
  id: string | number,
  shippingDetails: string,
): Promise<BusinessShopOrder> {
  const response = await ApiService.put<ApiEnvelope<unknown>>(
    orderEndpoints.shippingDetails(id),
    { shipping_details: shippingDetails },
  );
  const order = normalizeBusinessOrder(
    unwrap(response, "Failed to save shipping details"),
  );
  publishBusinessOrder(order);
  return order;
}

// ── Customer ────────────────────────────────────────────────────────

/** GET /api/orders — the customer's own orders ("My orders"); rows have no history. */
export async function fetchCustomerOrders(params: {
  page?: number;
  per_page?: number;
}): Promise<{ orders: ShopOrder[]; meta: ShopOrderListMeta | null }> {
  const response = await ApiService.get<
    ApiEnvelope<{ data: unknown[]; meta?: ShopOrderListMeta } | unknown[]>
  >(orderEndpoints.list({ page: params.page, per_page: params.per_page }));
  const data = unwrap(response, "Failed to fetch orders");
  // Paginated like the owner list; a plain array is accepted too
  if (Array.isArray(data)) {
    return { orders: data.map(normalizeShopOrder), meta: null };
  }
  return {
    orders: Array.isArray(data.data) ? data.data.map(normalizeShopOrder) : [],
    meta: data.meta ?? null,
  };
}

/** GET /api/orders/{order} — the screen order notifications open. */
export async function fetchCustomerOrder(
  id: string | number,
): Promise<ShopOrder> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    orderEndpoints.getById(id),
  );
  return normalizeShopOrder(unwrap(response, "Failed to fetch order"));
}
