import i18n from "i18next";
import { ApiService } from "./api";
import { orderEndpoints } from "./endpoints";
import type {
  BusinessShopOrder,
  OrderReturnMethod,
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

// New order push (no order body) → open order counts reload
const businessOrdersChangedListeners = new Set<() => void>();

export function subscribeToBusinessOrdersChanged(
  listener: () => void,
): () => void {
  businessOrdersChangedListeners.add(listener);
  return () => {
    businessOrdersChangedListeners.delete(listener);
  };
}

export function notifyBusinessOrdersChanged(): void {
  businessOrdersChangedListeners.forEach((listener) => listener());
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
  const data = unwrap(response, i18n.t("orderSvcFetchOrdersFailed"));
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
  return normalizeBusinessOrder(unwrap(response, i18n.t("orderSvcFetchOrderFailed")));
}

export async function fetchBusinessOrderStats(): Promise<ShopOrderStats> {
  const response = await ApiService.get<ApiEnvelope<unknown>>(
    orderEndpoints.businessStats,
  );
  return normalizeOrderStats(unwrap(response, i18n.t("orderSvcFetchStatsFailed")));
}

/**
 * PATCH /api/orders/{order}/status. `shippingDetails` is only accepted with
 * "shipped"; sending both in one call gives the customer one notification.
 */
export async function updateOrderStatus(
  id: string | number,
  status: ShopOrderNextStatus,
  shippingDetails?: string,
  options?: { refund?: boolean },
): Promise<BusinessShopOrder> {
  const body: {
    status: ShopOrderNextStatus;
    shipping_details?: string;
    refund?: boolean;
  } = {
    status,
  };
  if (status === "shipped" && shippingDetails) {
    body.shipping_details = shippingDetails;
  }
  // "Cancel and refund" / "Cancel without refund" (server default: refund)
  if (status === "cancelled" && typeof options?.refund === "boolean") {
    body.refund = options.refund;
  }
  const response = await ApiService.patch<ApiEnvelope<unknown>>(
    orderEndpoints.updateStatus(id),
    body,
  );
  const order = normalizeBusinessOrder(
    unwrap(response, i18n.t("orderSvcUpdateStatusFailed")),
  );
  publishBusinessOrder(order);
  return order;
}

/**
 * PATCH /api/orders/business/{order}/refund-request — answer the customer's
 * cancellation / refund request. `response` is required to decline (the
 * customer sees it).
 */
export async function respondToRefundRequest(
  id: string | number,
  body: { decision: "approve" | "decline"; response?: string },
): Promise<BusinessShopOrder> {
  const payload: { decision: "approve" | "decline"; response?: string } = {
    decision: body.decision,
  };
  const text = body.response?.trim();
  if (text) payload.response = text;
  const response = await ApiService.patch<ApiEnvelope<unknown>>(
    orderEndpoints.businessRefundRequest(id),
    payload,
  );
  const order = normalizeBusinessOrder(
    unwrap(response, i18n.t("orderSvcAnswerRequestFailed")),
  );
  publishBusinessOrder(order);
  return order;
}

/** POST /api/orders/business/{order}/refund — only when `canRefund` (cancelled without a refund). */
export async function refundBusinessOrder(
  id: string | number,
): Promise<BusinessShopOrder> {
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.businessRefund(id),
  );
  const order = normalizeBusinessOrder(
    unwrap(response, i18n.t("orderSvcRefundFailed")),
  );
  publishBusinessOrder(order);
  return order;
}

/**
 * POST /api/orders/business/{order}/confirm-receipt — the returned item
 * arrived; the order is refunded. Only when `canConfirmReceipt`.
 */
export async function confirmReturnReceipt(
  id: string | number,
): Promise<BusinessShopOrder> {
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.businessConfirmReceipt(id),
  );
  const order = normalizeBusinessOrder(
    unwrap(response, i18n.t("orderSvcConfirmReceiptFailed")),
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
    unwrap(response, i18n.t("orderSvcSaveShippingFailed")),
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
  const data = unwrap(response, i18n.t("orderSvcFetchOrdersFailed"));
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
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcFetchOrderFailed")));
}

export type RefundPhoto = { uri: string; name: string; type: string };

/**
 * JSON body, or multipart when a photo is attached. `multipart` always sends
 * form data (return / report / escalate endpoints are multipart/form-data).
 */
function buildRefundBody(
  fields: Record<string, string | undefined>,
  photo?: RefundPhoto | null,
  multipart = false,
): { body: unknown; config?: { headers: Record<string, string> } } {
  const entries = Object.entries(fields).filter(
    (entry): entry is [string, string] => !!entry[1] && entry[1].trim() !== "",
  );
  if (!photo && !multipart) {
    return {
      body: Object.fromEntries(entries.map(([k, v]) => [k, v.trim()])),
    };
  }
  const formData = new FormData();
  entries.forEach(([key, value]) => formData.append(key, value.trim()));
  if (photo) {
    formData.append("photo", {
      uri: photo.uri,
      name: photo.name,
      type: photo.type,
    } as any);
  }
  return {
    body: formData,
    config: { headers: { "Content-Type": "multipart/form-data" } },
  };
}

/**
 * POST /api/orders/{order}/refund-request — Cancel Order (before shipment,
 * reason changed_mind / other, optional). 422 `errors.order` explains a
 * refusal.
 */
export async function requestOrderCancellation(
  orderId: string | number,
  params: {
    reason?: string | null;
    note?: string | null;
    photo?: RefundPhoto | null;
  },
): Promise<ShopOrder> {
  const { body, config } = buildRefundBody(
    { reason: params.reason ?? undefined, note: params.note ?? undefined },
    params.photo,
  );
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.refundRequest(orderId),
    body,
    config,
  );
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcSendRequestFailed")));
}

/**
 * POST /api/orders/{order}/refund-request — Request Return (multipart).
 * reason: changed_mind | wrong_size_color | not_as_described | other;
 * return_method: shipping (server default) | in_person.
 * → refundState "return_requested".
 */
export async function requestOrderReturn(
  orderId: string | number,
  params: {
    reason?: string | null;
    note?: string | null;
    photo?: RefundPhoto | null;
    returnMethod?: OrderReturnMethod | null;
  },
): Promise<ShopOrder> {
  const { body, config } = buildRefundBody(
    {
      reason: params.reason ?? undefined,
      note: params.note ?? undefined,
      return_method: params.returnMethod ?? undefined,
    },
    params.photo,
    true,
  );
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.refundRequest(orderId),
    body,
    config,
  );
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcSendRequestFailed")));
}

/**
 * POST /api/orders/{order}/report — Report a Problem (multipart).
 * reason (required): damaged | wrong_item | never_arrived | other.
 * return_method is not sent for never_arrived (nothing to send back).
 * → refundState "problem_reported".
 */
export async function reportOrderProblem(
  orderId: string | number,
  params: {
    reason: string;
    note?: string | null;
    photo?: RefundPhoto | null;
    returnMethod?: OrderReturnMethod | null;
  },
): Promise<ShopOrder> {
  const { body, config } = buildRefundBody(
    {
      reason: params.reason,
      note: params.note ?? undefined,
      return_method: params.returnMethod ?? undefined,
    },
    params.photo,
    true,
  );
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.report(orderId),
    body,
    config,
  );
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcSendReportFailed")));
}

/** POST /api/orders/{order}/tracking — JSON → refundState "return_shipped". */
export async function addReturnTracking(
  orderId: string | number,
  trackingNumber: string,
): Promise<ShopOrder> {
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.tracking(orderId),
    { tracking_number: trackingNumber.trim() },
  );
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcSaveTrackingFailed")));
}

/** POST /api/orders/{order}/refund-request/escalate — "Ask FreshPass to review" (once). */
export async function escalateOrderRefund(
  orderId: string | number,
  params: { note: string; photo?: RefundPhoto | null },
): Promise<ShopOrder> {
  const { body, config } = buildRefundBody(
    { note: params.note },
    params.photo,
    true,
  );
  const response = await ApiService.post<ApiEnvelope<unknown>>(
    orderEndpoints.escalate(orderId),
    body,
    config,
  );
  return normalizeShopOrder(unwrap(response, i18n.t("orderSvcSendRequestFailed")));
}
