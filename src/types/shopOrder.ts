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
  /** Marketplace option (colour / model) bought, when the product has options. */
  variantId?: number | null;
  variantName?: string | null;
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

/**
 * Automatic refund: the payment arrived after the order was cancelled (e.g. the
 * product was deleted) or the item sold out. The order's status is `cancelled`.
 */
export interface ShopOrderRefund {
  status: "pending" | "refunded";
  reason: string | null;
  refundedAt: string | null;
}

export interface ShopOrderCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/** Customer-facing refund / cancellation state (null = nothing asked). */
export type OrderRefundState =
  | "cancellation_requested"
  | "refund_requested"
  | "refund_on_the_way"
  | "refunded"
  | "refund_declined"
  | "under_review"
  | "refunded_by_freshpass"
  | "declined_reviewed"
  | "cancelled_not_refunded";

/** The customer's cancellation / refund request on an order. */
export interface OrderRefundRequest {
  id: number;
  type: "cancellation" | "refund";
  status: string;
  reason: string | null;
  reasonLabel: string | null;
  note: string | null;
  photoUrl: string | null;
  sellerResponse: string | null;
  respondedAt: string | null;
  escalationNote: string | null;
  escalationPhotoUrl: string | null;
  escalatedAt: string | null;
  adminNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

/** Customer buttons: show each only when its flag is true. */
export interface OrderRefundActions {
  canRequestCancellation: boolean;
  canRequestRefund: boolean;
  /** End of the 7-day refund window (ISO). */
  refundDeadline: string | null;
  canEscalate: boolean;
}

/** Seller earnings. `stripeFee` / `net` are null until Stripe reports its fee ("Pending"). */
export interface OrderEarnings {
  gross: number;
  platformFee: number;
  stripeFee: number | null;
  net: number | null;
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
  /** Null unless the payment was refunded automatically. */
  refund: ShopOrderRefund | null;
  createdAt: string;
  /** Where the order came from (sets the platform fee). */
  source?: "marketplace" | "reel" | null;
  refundState?: OrderRefundState | null;
  refundRequest?: OrderRefundRequest | null;
  /** Customer responses only. */
  refundActions?: OrderRefundActions | null;
}

/** Owner shape: business order list / detail, and the PATCH status / PUT shipping-details responses. */
export interface BusinessShopOrder extends ShopOrder {
  customer: ShopOrderCustomer | null;
  /** Steps the owner can take now: one button per value, none when empty. */
  nextStatuses: ShopOrderNextStatus[];
  /** True when PUT /api/orders/{order}/shipping-details is allowed. */
  canEditShippingDetails: boolean;
  earnings?: OrderEarnings | null;
  /** Cancelled without a refund → "Refund" button. */
  canRefund?: boolean;
  /** Stripe refused the refund (e.g. low balance); retried automatically. */
  refundError?: string | null;
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
