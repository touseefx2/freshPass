import type {
  BusinessShopOrder,
  ShopOrder,
  ShopOrderCustomer,
  ShopOrderFilter,
  ShopOrderHistoryEntry,
  ShopOrderItem,
  ShopOrderListMeta,
  ShopOrderNextStatus,
  ShopOrderStats,
  ShopOrderStatus,
} from "@/src/types/shopOrder";
import type {
  ShopShippingAddress,
  ShopShippingMethod,
} from "@/src/types/shopProduct";

/** Max length of the shipping details text (backend rule). */
export const SHIPPING_DETAILS_MAX_LENGTH = 1000;

/** Filter chips on the owner's order list, in display order. */
export const ORDER_FILTERS: ShopOrderFilter[] = [
  "all",
  "paid",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
];

const ORDER_STATUSES: ShopOrderStatus[] = [
  "pending",
  "paid",
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
];

const NEXT_STATUSES: ShopOrderNextStatus[] = [
  "ready_for_pickup",
  "shipped",
  "completed",
  "cancelled",
];

// ── Normalizing API data ────────────────────────────────────────────

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return value && typeof value === "object" ? (value as Raw) : null;
}

function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toId(value: unknown): string {
  return value == null ? "" : String(value);
}

function toText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function toStatus(value: unknown): ShopOrderStatus {
  return ORDER_STATUSES.includes(value as ShopOrderStatus)
    ? (value as ShopOrderStatus)
    : "pending";
}

function toShippingMethod(value: unknown): ShopShippingMethod {
  return value === "local_pickup" ? "local_pickup" : "standard";
}

function normalizeAddress(value: unknown): ShopShippingAddress | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    fullName: toText(raw.fullName) ?? "",
    street: toText(raw.street) ?? "",
    city: toText(raw.city) ?? "",
    state: toText(raw.state) ?? "",
    zip: toText(raw.zip) ?? "",
  };
}

function normalizeItem(value: unknown): ShopOrderItem {
  const raw = asRecord(value) ?? {};
  return {
    id: toId(raw.id),
    productId: toId(raw.productId),
    productName: toText(raw.productName) ?? "",
    productImageUrl: toText(raw.productImageUrl),
    unitPrice: toNumber(raw.unitPrice),
    quantity: toNumber(raw.quantity),
    total: toNumber(raw.total),
  };
}

function normalizeHistoryEntry(value: unknown): ShopOrderHistoryEntry {
  const raw = asRecord(value) ?? {};
  return {
    id: toId(raw.id),
    event:
      raw.event === "shipping_details_updated"
        ? "shipping_details_updated"
        : "status_changed",
    status: toStatus(raw.status),
    shippingDetails: toText(raw.shippingDetails),
    createdAt: toId(raw.createdAt),
  };
}

function normalizeCustomer(value: unknown): ShopOrderCustomer | null {
  const raw = asRecord(value);
  if (!raw) return null;
  return {
    id: toId(raw.id),
    name: toText(raw.name) ?? "",
    email: toText(raw.email),
    phone: toText(raw.phone),
  };
}

/** Customer order (GET /api/orders/{order}). Missing lists become empty arrays. */
export function normalizeShopOrder(value: unknown): ShopOrder {
  const raw = asRecord(value) ?? {};
  return {
    id: toId(raw.id),
    status: toStatus(raw.status),
    shippingMethod: toShippingMethod(raw.shippingMethod),
    shippingAddress: normalizeAddress(raw.shippingAddress),
    shippingDetails: toText(raw.shippingDetails),
    subtotal: toNumber(raw.subtotal),
    shippingAmount: toNumber(raw.shippingAmount),
    taxAmount: toNumber(raw.taxAmount),
    total: toNumber(raw.total),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
    history: Array.isArray(raw.history)
      ? raw.history.map(normalizeHistoryEntry)
      : [],
    paidAt: toText(raw.paidAt),
    readyForPickupAt: toText(raw.readyForPickupAt),
    shippedAt: toText(raw.shippedAt),
    completedAt: toText(raw.completedAt),
    cancelledAt: toText(raw.cancelledAt),
    createdAt: toId(raw.createdAt),
  };
}

/** Owner order (business list rows, business detail, PATCH / PUT responses). */
export function normalizeBusinessOrder(value: unknown): BusinessShopOrder {
  const raw = asRecord(value) ?? {};
  const nextStatuses = Array.isArray(raw.nextStatuses)
    ? (raw.nextStatuses.filter((s) =>
        NEXT_STATUSES.includes(s as ShopOrderNextStatus),
      ) as ShopOrderNextStatus[])
    : [];
  return {
    ...normalizeShopOrder(raw),
    customer: normalizeCustomer(raw.customer),
    nextStatuses,
    canEditShippingDetails: raw.canEditShippingDetails === true,
  };
}

export function normalizeOrderStats(value: unknown): ShopOrderStats {
  const raw = asRecord(value) ?? {};
  return {
    pending: toNumber(raw.pending),
    paid: toNumber(raw.paid),
    ready_for_pickup: toNumber(raw.ready_for_pickup),
    shipped: toNumber(raw.shipped),
    completed: toNumber(raw.completed),
    cancelled: toNumber(raw.cancelled),
    refunded: toNumber(raw.refunded),
    totalRevenue: toNumber(raw.totalRevenue),
    todayOrders: toNumber(raw.todayOrders),
    todayRevenue: toNumber(raw.todayRevenue),
  };
}

/** Whether another page exists after the one described by `meta`. */
export function hasMoreOrderPages(meta: ShopOrderListMeta | null): boolean {
  if (!meta) return false;
  if (typeof meta.has_more === "boolean") return meta.has_more;
  return toNumber(meta.current_page) < toNumber(meta.last_page);
}

/**
 * Show the server's `message` (e.g. "Cannot transition from "shipped" to
 * "cancelled".") — the API client's own text for 404 is generic.
 */
export function getOrderErrorMessage(error: unknown, fallback: string): string {
  const err = asRecord(error);
  const apiMessage = toText(asRecord(err?.data)?.message);
  if (apiMessage) return apiMessage;
  const message = toText(err?.message);
  return message ?? fallback;
}

// ── Statuses and steps ──────────────────────────────────────────────

export function isPickupOrder(order: Pick<ShopOrder, "shippingMethod">): boolean {
  return order.shippingMethod === "local_pickup";
}

/** i18n key for a status label. `completed` reads "Picked up" (pickup orders). */
export function getOrderStatusLabelKey(
  status: ShopOrderStatus,
  shippingMethod?: ShopShippingMethod | null,
): string {
  switch (status) {
    case "pending":
      return "orderStatusPending";
    case "paid":
      return "orderStatusNew";
    case "ready_for_pickup":
      return "orderStatusReadyForPickup";
    case "shipped":
      return "orderStatusShipped";
    case "completed":
      // Shipping orders completed before shipped became the last step
      return shippingMethod === "standard"
        ? "orderStatusCompleted"
        : "orderStatusPickedUp";
    case "cancelled":
      return "orderStatusCancelled";
    case "refunded":
      return "orderStatusRefunded";
  }
}

/** i18n key for a filter chip. */
export function getOrderFilterLabelKey(filter: ShopOrderFilter): string {
  return filter === "all"
    ? "ordersFilterAll"
    : getOrderStatusLabelKey(filter, "local_pickup");
}

/** Button label for a value of `nextStatuses`. */
export function getOrderActionLabelKey(status: ShopOrderNextStatus): string {
  switch (status) {
    case "shipped":
      return "orderActionMarkShipped";
    case "ready_for_pickup":
      return "orderActionMarkReady";
    case "completed":
      return "orderActionMarkPickedUp";
    case "cancelled":
      return "orderActionCancel";
  }
}

/** Forward steps get a button each; cancel is shown apart as the destructive one. */
export function splitNextStatuses(nextStatuses: ShopOrderNextStatus[]): {
  forward: ShopOrderNextStatus[];
  canCancel: boolean;
} {
  return {
    forward: nextStatuses.filter((s) => s !== "cancelled"),
    canCancel: nextStatuses.includes("cancelled"),
  };
}

export type OrderFlowStep = "paid" | "ready_for_pickup" | "shipped" | "completed";

/** Milestones in order: shipping paid → shipped; pickup paid → ready → picked up. */
export function getOrderFlow(shippingMethod: ShopShippingMethod): OrderFlowStep[] {
  return shippingMethod === "local_pickup"
    ? ["paid", "ready_for_pickup", "completed"]
    : ["paid", "shipped"];
}

type OrderTimestamps = Pick<
  ShopOrder,
  "paidAt" | "readyForPickupAt" | "shippedAt" | "completedAt" | "cancelledAt"
>;

function getStepTimestamp(
  order: OrderTimestamps,
  step: OrderFlowStep,
): string | null {
  switch (step) {
    case "paid":
      return order.paidAt;
    case "ready_for_pickup":
      return order.readyForPickupAt;
    case "shipped":
      return order.shippedAt;
    case "completed":
      return order.completedAt;
  }
}

function isTerminalStop(status: ShopOrderStatus): boolean {
  return status === "cancelled" || status === "refunded";
}

/** How many milestones of the flow the order has reached (0 while unpaid). */
export function getReachedStepCount(
  order: Pick<ShopOrder, "status" | "shippingMethod"> & OrderTimestamps,
): number {
  const flow = getOrderFlow(order.shippingMethod);
  if (order.status === "pending") return 0;
  if (isTerminalStop(order.status)) {
    // Count the steps that happened before the order stopped
    let reached = 0;
    for (const step of flow) {
      if (!getStepTimestamp(order, step)) break;
      reached += 1;
    }
    return reached;
  }
  // Legacy shipping orders could still end as `completed`
  if (order.status === "completed") return flow.length;
  const index = flow.indexOf(order.status as OrderFlowStep);
  return index >= 0 ? index + 1 : 1;
}

/** "Step N of M" for the owner's step header; null while unpaid or once stopped. */
export function getOrderStepProgress(
  order: Pick<ShopOrder, "status" | "shippingMethod"> & OrderTimestamps,
): { current: number; total: number } | null {
  if (order.status === "pending" || isTerminalStop(order.status)) return null;
  return {
    current: getReachedStepCount(order),
    total: getOrderFlow(order.shippingMethod).length,
  };
}

export type OrderJourneyStepState = "done" | "next" | "upcoming" | "stopped";

export type OrderJourneyStep = {
  key: OrderFlowStep | "cancelled" | "refunded";
  state: OrderJourneyStepState;
  at: string | null;
};

/**
 * Tracker rows: reached milestones (done), the next one, the rest (upcoming).
 * A cancelled / refunded order shows what it reached, then where it stopped.
 */
export function getOrderJourney(
  order: Pick<ShopOrder, "status" | "shippingMethod"> & OrderTimestamps,
): OrderJourneyStep[] {
  const flow = getOrderFlow(order.shippingMethod);
  const reached = getReachedStepCount(order);

  if (isTerminalStop(order.status)) {
    const steps: OrderJourneyStep[] = flow.slice(0, reached).map((key) => ({
      key,
      state: "done",
      at: getStepTimestamp(order, key),
    }));
    steps.push({
      key: order.status === "refunded" ? "refunded" : "cancelled",
      state: "stopped",
      at: order.status === "cancelled" ? order.cancelledAt : null,
    });
    return steps;
  }

  return flow.map((key, index) => ({
    key,
    state: index < reached ? "done" : index === reached ? "next" : "upcoming",
    at: index < reached ? getStepTimestamp(order, key) : null,
  }));
}

/** Tracker row title for a journey step. */
export function getJourneyStepLabelKey(
  key: OrderJourneyStep["key"],
  shippingMethod: ShopShippingMethod,
): string {
  if (key === "paid") return "orderStepPaid";
  return getOrderStatusLabelKey(key, shippingMethod);
}

/** Title + text of the "what now" card on the owner's order screen. */
export function getOwnerStageKeys(
  order: Pick<
    BusinessShopOrder,
    "status" | "shippingMethod" | "canEditShippingDetails"
  >,
): { title: string; text: string } {
  const pickup = isPickupOrder(order);
  switch (order.status) {
    case "pending":
      return {
        title: "orderStageAwaitingPaymentTitle",
        text: "orderStageAwaitingPaymentOwner",
      };
    case "paid":
      return pickup
        ? { title: "orderStagePrepareTitle", text: "orderStagePrepareOwner" }
        : { title: "orderStageShipTitle", text: "orderStageShipOwner" };
    case "ready_for_pickup":
      return {
        title: "orderStageWaitingPickupTitle",
        text: "orderStageWaitingPickupOwner",
      };
    case "shipped":
      return {
        title: "orderStageShippedTitle",
        text: order.canEditShippingDetails
          ? "orderStageShippedOwner"
          : "orderStageDoneOwner",
      };
    case "completed":
      return {
        title: pickup ? "orderStagePickedUpTitle" : "orderStageCompletedTitle",
        text: "orderStageDoneOwner",
      };
    case "cancelled":
      return {
        title: "orderStageCancelledTitle",
        text: "orderStageCancelledOwner",
      };
    case "refunded":
      return {
        title: "orderStageRefundedTitle",
        text: "orderStageRefundedText",
      };
  }
}

/** Title + text of the status card on the customer's order screen. */
export function getCustomerStageKeys(
  order: Pick<ShopOrder, "status" | "shippingMethod" | "shippingDetails">,
): { title: string; text: string } {
  const pickup = isPickupOrder(order);
  switch (order.status) {
    case "pending":
      return {
        title: "orderStatusPending",
        text: "orderStagePendingCustomer",
      };
    case "paid":
      return {
        title: "orderStageReceivedTitle",
        text: pickup
          ? "orderStagePreparingPickupCustomer"
          : "orderStagePreparingShipCustomer",
      };
    case "ready_for_pickup":
      return {
        title: "orderStatusReadyForPickup",
        text: "orderStageReadyCustomer",
      };
    case "shipped":
      return {
        title: "orderStageOnTheWayTitle",
        text: order.shippingDetails
          ? "orderStageShippedCustomer"
          : "orderStageShippedNoDetailsCustomer",
      };
    case "completed":
      return pickup
        ? { title: "orderStatusPickedUp", text: "orderStagePickedUpCustomer" }
        : { title: "orderStatusCompleted", text: "orderStageCompletedCustomer" };
    case "cancelled":
      return {
        title: "orderStatusCancelled",
        text: "orderStageCancelledCustomer",
      };
    case "refunded":
      return {
        title: "orderStatusRefunded",
        text: "orderStageRefundedText",
      };
  }
}

/** Timeline row title for a history entry. */
export function getHistoryEntryLabelKey(
  entry: Pick<ShopOrderHistoryEntry, "event" | "status">,
  shippingMethod: ShopShippingMethod,
): string {
  if (entry.event === "shipping_details_updated") {
    return "orderHistoryDetailsUpdated";
  }
  switch (entry.status) {
    case "pending":
      return "orderHistoryPlaced";
    case "paid":
      return "orderHistoryPaid";
    case "ready_for_pickup":
      return "orderHistoryReady";
    case "shipped":
      return "orderHistoryShipped";
    case "completed":
      return shippingMethod === "local_pickup"
        ? "orderHistoryPickedUp"
        : "orderHistoryCompleted";
    case "cancelled":
      return "orderHistoryCancelled";
    case "refunded":
      return "orderHistoryRefunded";
  }
}

/** Shipping details to print under a timeline row (details edits, and the shipped step). */
export function getHistoryEntryDetails(
  entry: Pick<ShopOrderHistoryEntry, "event" | "status" | "shippingDetails">,
): string | null {
  if (entry.event === "shipping_details_updated") return entry.shippingDetails;
  return entry.status === "shipped" ? entry.shippingDetails : null;
}

/** First item + how many more, for compact order rows. */
export function getItemsSummary(items: ShopOrderItem[]): {
  first: ShopOrderItem | null;
  moreCount: number;
} {
  return { first: items[0] ?? null, moreCount: Math.max(0, items.length - 1) };
}

/**
 * Shipping details to send with "Mark as shipped": only text that is new,
 * so an unchanged or empty box keeps what is already saved.
 */
export function getShipDetailsToSend(
  draft: string,
  current: string | null,
): string | undefined {
  const text = draft.trim();
  if (!text) return undefined;
  return text === (current ?? "").trim() ? undefined : text;
}

/** The PUT needs non-empty text that differs from what is saved. */
export function canSaveShippingDetails(
  draft: string,
  current: string | null,
): boolean {
  const text = draft.trim();
  return text.length > 0 && text !== (current ?? "").trim();
}

/**
 * Put an updated order into a loaded list page: replace it in place, or drop
 * it when it no longer matches the active status filter.
 */
export function applyOrderUpdateToList(
  orders: BusinessShopOrder[],
  updated: BusinessShopOrder,
  filter: ShopOrderFilter,
): BusinessShopOrder[] {
  const index = orders.findIndex((o) => o.id === updated.id);
  if (index < 0) return orders;
  if (filter !== "all" && updated.status !== filter) {
    return orders.filter((o) => o.id !== updated.id);
  }
  const next = orders.slice();
  // List rows never carry history
  next[index] = { ...updated, history: [] };
  return next;
}

/** Address lines: name, street, "Austin, TX 73301". Empty parts are skipped. */
export function formatOrderAddressLines(
  address: ShopShippingAddress | null,
): string[] {
  if (!address) return [];
  const stateZip = [address.state, address.zip].filter(Boolean).join(" ");
  const cityLine = [address.city, stateZip].filter(Boolean).join(", ");
  return [address.fullName, address.street, cityLine].filter(Boolean);
}
