import type {
  ShopShippingAddress,
  ShopShippingMethod,
} from "@/src/types/shopProduct";

/**
 * Product order status. The business moves each order along by hand:
 * - shipping (`standard`): paid → shipped
 * - pickup (`local_pickup`): paid → ready_for_pickup → completed ("Picked up")
 * `cancelled` is allowed from paid / ready_for_pickup. `pending` is an unpaid checkout.
 */
export type ShopOrderStatus =
  | "pending"
  | "paid"
  | "ready_for_pickup"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunded";

/** Values the owner can send to PATCH /api/orders/{order}/status. */
export type ShopOrderNextStatus =
  | "ready_for_pickup"
  | "shipped"
  | "completed"
  | "cancelled";

export interface ShopOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  unitPrice: number;
  quantity: number;
  total: number;
}

export type ShopOrderHistoryEvent = "status_changed" | "shipping_details_updated";

export interface ShopOrderHistoryEntry {
  id: string;
  /**
   * status_changed: the status became `status`.
   * shipping_details_updated: the details changed while the status stayed the same.
   */
  event: ShopOrderHistoryEvent;
  status: ShopOrderStatus;
  /** The shipping details as they were at that moment. */
  shippingDetails: string | null;
  createdAt: string;
}

export interface ShopOrderCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/** Fields shared by the customer order (GET /api/orders/{order}) and the owner order. */
export interface ShopOrder {
  id: string;
  status: ShopOrderStatus;
  shippingMethod: ShopShippingMethod;
  shippingAddress: ShopShippingAddress | null;
  /** Free text from the business (courier, tracking number, link). Always null on pickup orders. */
  shippingDetails: string | null;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  items: ShopOrderItem[];
  /** Oldest first. Only the single-order endpoints send it (empty for list rows). */
  history: ShopOrderHistoryEntry[];
  paidAt: string | null;
  readyForPickupAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

/** Owner shape: business order list / detail, and the PATCH status / PUT shipping-details responses. */
export interface BusinessShopOrder extends ShopOrder {
  customer: ShopOrderCustomer | null;
  /** Steps the owner can take now: one button per value, none when empty. */
  nextStatuses: ShopOrderNextStatus[];
  /** True when PUT /api/orders/{order}/shipping-details is allowed. */
  canEditShippingDetails: boolean;
}

/** GET /api/orders/business/stats */
export interface ShopOrderStats {
  pending: number;
  paid: number;
  ready_for_pickup: number;
  shipped: number;
  completed: number;
  cancelled: number;
  refunded: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
}

export interface ShopOrderListMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number | null;
  to: number | null;
  has_more?: boolean;
}

/** Status filter on the owner's order list ("all" sends no status). */
export type ShopOrderFilter =
  | "all"
  | "paid"
  | "ready_for_pickup"
  | "shipped"
  | "completed"
  | "cancelled";
